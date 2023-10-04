/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Logger } from '@aws-lambda-powertools/logger';
import {
  ServiceQuotasClient,
  ListServiceQuotasCommand,
  ServiceQuota,
  ListServiceQuotasCommandOutput,
} from '@aws-sdk/client-service-quotas';

const logger = new Logger();

export interface ServiceQuotaRequirement {
  readonly quotaName: string;
  readonly serviceCode: string;
  readonly minimumValue: number;
}

export interface ResourceProperties {
  readonly ServiceQuotaRequirements: string;
  readonly ReportOnly?: 'true' | 'false';
}
export interface Event {
  readonly RequestType: 'Create' | 'Update' | 'Delete';
  readonly PhysicalResourceId?: string;
  readonly ResourceProperties: ResourceProperties;
}

export interface ReportItem {
  readonly requirement: ServiceQuotaRequirement;
  readonly success: boolean;
  readonly quota?: ServiceQuota;
  readonly reason?: string;
  readonly quotaUrl?: string;
}

export interface Data {
  readonly Report: ReportItem[];
  readonly Success: boolean;
  readonly FailedCount: number;
}

export interface Response {
  readonly PhysicalResourceId?: string;
  readonly Data?: Data;
}

const client = new ServiceQuotasClient({});

async function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function getAllServiceQuotas(
  serviceCode: string,
): Promise<ServiceQuota[]> {
  const serviceQuotas: ServiceQuota[] = [];
  let nextToken: string | undefined = undefined;
  let i = 0;
  do {
    if (nextToken) {
      await delay(i * 250);
    }

    const response: ListServiceQuotasCommandOutput = await client.send(
      new ListServiceQuotasCommand({
        ServiceCode: serviceCode,
        MaxResults: 100,
        NextToken: nextToken,
      }),
    );
    logger.debug({ message: 'ListServiceQuotasCommand:Response:', response });
    nextToken = response.NextToken;
    response.Quotas && serviceQuotas.push(...response.Quotas);
    i++;
  } while (nextToken != null && i < 100);

  logger.debug({
    message: 'ServiceQuotas:',
    serviceCode,
    serviceQuotas: serviceQuotas.length,
  });

  return serviceQuotas;
}

export const handler = async (event: Event): Promise<Response> => {
  logger.info({ message: 'Event:', event });
  switch (event.RequestType) {
    case 'Create':
    case 'Update': {
      const reportOnly = event.ResourceProperties.ReportOnly === 'true';
      const requirements = JSON.parse(
        event.ResourceProperties.ServiceQuotaRequirements,
      ) as ServiceQuotaRequirement[];
      const serviceCodes = new Set(requirements.map((v) => v.serviceCode));
      const lookup: Record<string, ServiceQuota[]> = Object.fromEntries(
        await Promise.all(
          Array.from(serviceCodes).map(async (serviceCode, i) => {
            await delay(i * 500); // prevent throttle (10 TPS)
            return [serviceCode, await getAllServiceQuotas(serviceCode)];
          }),
        ),
      );
      logger.info({
        message: 'Fetch service quotes',
        lookup: Object.fromEntries(
          Object.entries(lookup).map(([key, value]) => [key, value.length]),
        ),
      });

      const report: ReportItem[] = [];

      for (const requirement of requirements) {
        const quota = lookup[requirement.serviceCode]?.find(
          (_quota) => _quota.QuotaName === requirement.quotaName,
        );
        if (quota == null) {
          logger.error({
            message: `Invalid ServiceQuota requirements: ServiceCode=${requirement.serviceCode}, QuotaName=${requirement.quotaName}`,
            requirements,
          });

          report.push({
            requirement,
            success: false,
            reason: 'Invalid serviceCode and/or quotaName',
          });
        } else {
          const region =
            process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
          const quotaUrl = `https://${region}.console.aws.amazon.com/servicequotas/home/services/${quota.ServiceCode}/quotas/${quota.QuotaCode}`;

          if (quota.Value && quota.Value >= requirement.minimumValue) {
            report.push({
              requirement,
              quota,
              quotaUrl,
              success: true,
            });
          } else {
            report.push({
              requirement,
              quota,
              success: false,
              quotaUrl,
              reason: 'Insufficient quota value',
            });
          }
        }
      }

      const failed = report.filter((v) => !v.success);
      const failedCount = failed.length;

      logger.info({ message: 'Results:', report, failed, failedCount });

      if (failedCount) {
        const error = new Error(
          `Unmet ServiceQuota requirements: ${JSON.stringify(failed, null, 2)}`,
        );
        if (reportOnly) {
          logger.warn(`[ReportOnly] ${error.message}`, error);

          return {
            PhysicalResourceId: event.PhysicalResourceId,
            Data: {
              Report: report,
              Success: false,
              FailedCount: failedCount,
            },
          };
        } else {
          logger.error(error.message, error);
          throw error;
        }
      } else {
        return {
          PhysicalResourceId: event.PhysicalResourceId,
          Data: {
            Report: report,
            Success: true,
            FailedCount: 0,
          },
        };
      }
    }
    case 'Delete': {
      return {
        PhysicalResourceId: event.PhysicalResourceId,
      };
    }
  }
};

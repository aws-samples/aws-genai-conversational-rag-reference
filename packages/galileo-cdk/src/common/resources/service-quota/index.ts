/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  Annotations,
  CustomResource,
  Duration,
  Lazy,
  Stack,
} from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct, IDependable } from 'constructs';
import { HandlerFunction } from './handler-function';
import { ServiceQuotaRequirement } from './handler.lambda';

export { ServiceQuotaRequirement };

function rootStackOf(scope: IConstruct): Stack {
  let stack = Stack.of(scope);
  while (stack.nestedStackParent) {
    stack = stack.nestedStackParent;
  }

  return stack;
}

export class ServiceQuotas extends Construct implements IDependable {
  static readonly UUID: string = 'ServiceQuotas_2MTWPddYlb';

  static of(scope: IConstruct): ServiceQuotas {
    const rootStack = rootStackOf(scope);
    return (
      (rootStack.node.tryFindChild(ServiceQuotas.UUID) as ServiceQuotas) ||
      new ServiceQuotas(rootStack, ServiceQuotas.UUID)
    );
  }

  static addRequirement(
    scope: IConstruct,
    requirement: ServiceQuotaRequirement,
    addDependency: boolean = true,
  ): void {
    const serviceQuota = ServiceQuotas.of(scope);
    serviceQuota.addRequirement(requirement);
    addDependency && scope.node.addDependency(serviceQuota);
  }

  /** @internal */
  protected readonly _requirements: Map<string, ServiceQuotaRequirement> =
    new Map();

  protected _reportOnly: boolean = false;

  protected _resource: CustomResource;

  protected constructor(scope: Construct, id: string) {
    super(scope, id);

    const onEventHandler = new HandlerFunction(this, 'Lambda', {
      timeout: Duration.minutes(5),
      initialPolicy: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['servicequotas:ListServiceQuotas'],
          resources: ['*'],
        }),
      ],
    });
    NagSuppressions.addResourceSuppressions(
      onEventHandler,
      [
        {
          id: 'AwsPrototyping-IAMNoManagedPolicies',
          reason:
            'AWS lambda basic execution role is acceptable since it allows for logging',
        },
        {
          id: 'AwsPrototyping-IAMNoWildcardPermissions',
          reason:
            'The handler will not know in advance which quotas it needs to list',
          appliesTo: ['Resource::*'],
        },
      ],
      true,
    );

    const provider = new Provider(this, 'Provider', {
      onEventHandler,
    });
    const serviceToken = provider.serviceToken;

    NagSuppressions.addResourceSuppressions(
      provider,
      [
        {
          id: 'AwsPrototyping-IAMNoManagedPolicies',
          reason:
            'AWS lambda basic execution role is acceptable since it allows for logging',
        },
        {
          id: 'AwsPrototyping-IAMNoWildcardPermissions',
          reason:
            'The handler will not know in advance which quotas it needs to list',
          appliesTo: ['Resource::*'],
        },
      ],
      true,
    );

    const requirementsToken = Lazy.string({
      produce: () => {
        return JSON.stringify([...this._requirements.values()]);
      },
    });

    this._resource = new CustomResource(this, 'CustomResource', {
      serviceToken,
      resourceType: 'Custom::ServiceQuota',
      properties: {
        ServiceQuotaRequirements: requirementsToken,
        ReportOnly: Lazy.string({
          produce: () => {
            return this._reportOnly ? 'true' : 'false';
          },
        }),
      },
    });

    Annotations.of(this).addInfo(
      `ServiceQuotaRequirements: ${requirementsToken}`,
    );
  }

  get dependencyRoots(): IConstruct[] {
    return [this._resource.node.defaultChild || this._resource];
  }

  reportOnly(value: boolean = true): void {
    this._reportOnly = value;
  }

  formatId(requirement: ServiceQuotaRequirement): string {
    return `${requirement.serviceCode}::${requirement.quotaName}`;
  }

  addRequirement(requirement: ServiceQuotaRequirement): void {
    const id = this.formatId(requirement);
    const existing = this._requirements.get(id);
    if (existing) {
      this._requirements.set(id, {
        ...existing,
        minimumValue: existing.minimumValue + requirement.minimumValue,
      });
    } else {
      this._requirements.set(id, requirement);
    }
  }
}

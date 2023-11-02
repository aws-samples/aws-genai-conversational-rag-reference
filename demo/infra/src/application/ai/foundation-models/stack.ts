/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { IFoundationModelInventory } from '@aws/galileo-cdk/lib/ai/predefined';
import { ApplicationContext } from '@aws/galileo-cdk/lib/core/app';
import { ApplicationConfig } from '@aws/galileo-cdk/lib/core/app/context/types';
import { Arn, ArnFormat, CfnOutput, SecretValue, Stack } from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ISecret, ReplicaRegion, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { FoundationModels } from './models';
import { NetworkingLayer } from '../../networking/layer';
import { MonitoredStack, MonitoredStackProps } from 'src/application/monitoring';

export interface FoundationModelStackProps extends MonitoredStackProps {
  /**
   * Vcp for the application, which if in the same region as the foundation model stack
   * will be reused. Otherwise if cross-region stacks the foundation stack will create
   * its own networking layer and vpc.
   */
  readonly applicationVpc?: IVpc;
  /**
   * Create role to allow cross-account access. Useful during development to support developer accounts
   * reusing the foundation model stack from the primary development account to reduce cost and prevent
   * capacity issues with deploying large model instances.
   */
  readonly enableCrossAccountRole?: boolean;

  readonly config: ApplicationConfig;
}

export class FoundationModelStack extends MonitoredStack {
  readonly inventory: IFoundationModelInventory;

  readonly inventorySecretName: string;

  readonly isCrossRegion: boolean;

  private readonly _secret: Secret;

  private readonly _invokeModelsPolicyStatements: iam.PolicyStatement[];

  private readonly _crossAccountRole?: iam.Role;

  readonly crossAccountRoleArn?: string;

  readonly bedrockEnabled: boolean;

  get deployedModelIds(): string[] {
    return Object.keys(this.inventory.models);
  }

  get defaultModelId(): string {
    return this.inventory.defaultModelId;
  }

  constructor(scope: Construct, id: string, props: FoundationModelStackProps) {
    super(scope, id, {
      ...props,
      monitoring: {
        ...props.monitoring,
        monitorStackProps: props.monitoring?.monitorStackProps || {
          elasticCache: { enabled: false },
        },
      },
    });

    const { applicationVpc, config } = props;

    this.bedrockEnabled = config.bedrock?.enabled === true;

    let vpc: IVpc;
    if (applicationVpc && Stack.of(applicationVpc).region === this.region) {
      // We can reuse the vpc since in the same region
      vpc = applicationVpc;
    } else {
      // TODO: Need to setup vpc links for cross-region?
      vpc = new NetworkingLayer(this, 'Networking').vpc;
    }

    const models = new FoundationModels(this, 'FoundationModels', {
      vpc,
      ...config,
    });

    const applicationRegion = Stack.of(scope).region;
    this.isCrossRegion = applicationRegion !== this.region;

    this.inventorySecretName = ApplicationContext.safeResourceName(this, 'FoundationModelInventory');
    this.inventory = models.inventory;

    this._secret = new InventorySecret(this, 'ModelInventorySecret', {
      inventory: this.inventory,
      secretName: this.inventorySecretName,
      replicaRegions: this.isCrossRegion
        ? [
            {
              region: applicationRegion,
            },
          ]
        : undefined,
    });
    NagSuppressions.addResourceSuppressions(
      this._secret,
      [
        {
          id: 'AwsPrototyping-SecretsManagerRotationEnabled',
          reason: 'non-secrets used for x-region deployment',
        },
      ],
      true,
    );

    this._invokeModelsPolicyStatements = [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sagemaker:InvokeEndpoint', 'sagemaker:DescribeEndpoint'],
        resources: [
          Stack.of(this).formatArn({
            service: 'sagemaker',
            resource: 'endpoint',
            // [Security] Unable to scope to endpoint name due to cross-environment without coupling stacks unnecessarily
            resourceName: '*',
            region: '*',
          }),
        ],
      }),
    ];

    if (this.bedrockEnabled) {
      this._invokeModelsPolicyStatements.push(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['bedrock:Invoke*'],
          resources: ['*'],
        }),
      );
    }

    if (props.enableCrossAccountRole) {
      const roleName = ApplicationContext.safeResourceName(scope, 'FoundationModel-CrossAccount');
      this._crossAccountRole = new iam.Role(this, 'CrossAccountRole', {
        roleName,
        // Developers will add account trust policies to the role via the console.
        assumedBy: new iam.AccountRootPrincipal(),
        description: 'Cross-account role for foundation model inventory and invocation',
        inlinePolicies: {
          Secrets: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
                resources: [
                  // Region agnostic arn for the secret to support cross-region replication version
                  Arn.format({
                    ...Stack.of(this).splitArn(this._secret.secretArn, ArnFormat.COLON_RESOURCE_NAME),
                    region: '*',
                  }),
                ],
              }),
            ],
          }),
          FoundationModels: new iam.PolicyDocument({
            statements: [...this.invokeModelsPolicyStatements],
          }),
        },
      });
      NagSuppressions.addResourceSuppressions(
        this._crossAccountRole,
        [
          {
            id: 'AwsPrototyping-IAMNoWildcardPermissions',
            reason:
              "Actions are scoped. Don't know all SageMaker endpoint names or Bedrock model ids at deployment time",
          },
        ],
        true,
      );

      this._secret.grantRead(this._crossAccountRole);

      this.crossAccountRoleArn = this.formatArn({
        service: 'iam',
        resource: 'role',
        resourceName: roleName,
        region: '',
      });

      new CfnOutput(this, 'FoundationModelCrossAccountRole', {
        value: this._crossAccountRole.roleArn,
      });
    }

    new CfnOutput(this, 'ModelInventorySecretName', {
      value: this.inventorySecretName,
    });

    new CfnOutput(this, 'ModelInventorySecretArn', {
      value: this._secret.secretArn,
    });
  }

  get invokeModelsPolicyStatements(): iam.PolicyStatement[] {
    // can not reuse statements so we need to make a copy of each
    return this._invokeModelsPolicyStatements.map((v) => v.copy());
  }

  proxyInventorySecret(scope: Construct): ISecret {
    const uuid = `FoundationModelStack-InventorySecret-${this.inventorySecretName}`;
    const existing = Stack.of(scope).node.tryFindChild(uuid) as ISecret | undefined;
    if (existing) {
      return existing;
    }

    const secret = Secret.fromSecretNameV2(Stack.of(scope), uuid, this.inventorySecretName);

    // Ensure the primary secret is updated and proxy depends on primary
    Stack.of(scope).addDependency(this);

    return secret;
  }

  grantAssumeCrossAccountRole(grantable: iam.IGrantable): void {
    if (this.crossAccountRoleArn) {
      grantable.grantPrincipal.addToPrincipalPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['sts:AssumeRole'],
          resources: [this.crossAccountRoleArn],
        }),
      );
    } else {
      throw new Error('CrossAccountRole is not enabled');
    }
  }
}

interface InventorySecretProps {
  readonly inventory: IFoundationModelInventory;
  readonly secretName: string;
  readonly replicaRegions?: ReplicaRegion[];
}

class InventorySecret extends Secret {
  constructor(scope: Construct, id: string, props: InventorySecretProps) {
    super(scope, id, {
      secretName: props.secretName,
      description:
        'Foundation model inventory config for referencing models by deterministic id throughout the solution',
      replicaRegions: props.replicaRegions,
      secretStringValue: SecretValue.unsafePlainText(JSON.stringify(props.inventory, null, 2)),
    });
  }
}

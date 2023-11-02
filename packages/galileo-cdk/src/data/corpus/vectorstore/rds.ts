/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { IGrantable } from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { stageAwareRemovalPolicy } from '../../../common/utils';

export interface RDSVectorStoreProps {
  readonly vpc: ec2.IVpc;
  /**
   * The RDS Postgres engine to use.
   * - Make sure the version supports pgvector
   * @default "auroraPostgres 15_3"
   * @see https://aws.amazon.com/about-aws/whats-new/2023/07/amazon-aurora-postgresql-pgvector-vector-storage-similarity-search/
   */
  readonly engine?: rds.IClusterEngine;

  /**
   * Cluster removal policy
   * @default
   * - `RemovalPolicy.SNAPSHOT` Unless Dev stage, then `RemovalPolicy.DESTROY`
   */
  readonly removalPolicy?: RemovalPolicy;
  /**
   * Whether to enable mapping of AWS Identity and Access Management (IAM) accounts to database accounts.
   *
   * This requires creating users with `rds_iam` role in postgre db - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.DBAccounts.html#UsingWithRDS.IAMDBAuth.DBAccounts.PostgreSQL
   * @default false
   */
  readonly iamAuthentication?: boolean;
  /**
   * Whether to require Transport Layer Security (TLS) for connections.
   * @default true
   */
  readonly requireTLS?: boolean;

  /**
   * Port
   * @default 5432
   */
  readonly port?: number;

  /**
   * Minimum capacity for serverless cluster; 1 unit = 2GB
   * @default 1 (2GB)
   */
  readonly minCapacity?: 1;
  /**
   * Maximum capacity for serverless cluster; 1 unit = 2GB
   * @default 50 (100GB)
   */
  readonly maxCapacity?: 50;
}

export class RDSVectorStore extends Construct {
  static validateEngine(engine: rds.IClusterEngine): void {
    switch (engine.engineType) {
      case 'aurora-postgresql': {
        if (engine.engineVersion == null) {
          throw new Error('Must use explicit version for RDS cluster engine');
        }
        const [major, minor] = engine.engineVersion.majorVersion.split('.').map(parseInt);
        // https://aws.amazon.com/about-aws/whats-new/2023/07/amazon-aurora-postgresql-pgvector-vector-storage-similarity-search/
        if (major > 15) return;
        if (
          (major === 15 && minor < 3) ||
          (major === 14 && minor < 8) ||
          (major === 13 && minor < 11) ||
          (major === 12 && minor < 15)
        ) {
          throw new Error(
            `Aurora PostgreSQL version ${engine.engineVersion.majorVersion} does not support pgvector; see https://aws.amazon.com/about-aws/whats-new/2023/07/amazon-aurora-postgresql-pgvector-vector-storage-similarity-search/`,
          );
        }
        return;
      }
      default: {
        throw new Error(`Engine type must be "aurora-postgressql"; ${engine.engineType} is not supported`);
      }
    }
  }

  readonly cluster: rds.DatabaseCluster;
  readonly connectionSecret: ISecret;
  readonly securityGroup: ec2.SecurityGroup;

  readonly proxy: rds.DatabaseProxy;
  /**
   * Whether IAM Authentication is enabled on the cluster
   */
  readonly iamAuthentication: boolean;
  /**
   * Whether Transport Layer Security (TLS) is required for connections
   */
  readonly requireTLS: boolean;

  get proxyEndpoint(): string {
    return this.proxy.endpoint;
  }

  /**
   * Record of runtime environment variables to access/config the connection.
   */
  get environment() {
    return {
      PGSSLMODE: this.requireTLS ? 'full-verify' : 'prefer',
      RDS_PGVECTOR_STORE_SECRET: this.connectionSecret.secretName,
      RDS_PGVECTOR_PROXY_ENDPOINT: this.proxyEndpoint,
      RDS_PGVECTOR_IAM_AUTH: this.iamAuthentication ? '1' : '0',
      RDS_PGVECTOR_TLS_ENABLED: this.requireTLS ? '1' : '0',
    } as const;
  }

  constructor(scope: Construct, id: string, props: RDSVectorStoreProps) {
    super(scope, id);

    const port = props.port || 5432;

    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      description: 'RDS Postgres security group',
    });
    this.securityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(port),
      'Allow VPC resources access',
    );

    const engine =
      props.engine ??
      rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_3,
      });

    // make sure the engine supports pgvector
    RDSVectorStore.validateEngine(engine);

    this.iamAuthentication = props.iamAuthentication ?? false;
    this.requireTLS = props.requireTLS ?? true;

    this.cluster = new rds.DatabaseCluster(this, 'Cluster', {
      engine,
      port,
      writer: rds.ClusterInstance.serverlessV2('Primary'),
      removalPolicy: props.removalPolicy ?? stageAwareRemovalPolicy(this),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [this.securityGroup],
      iamAuthentication: this.iamAuthentication,
      storageType: rds.DBClusterStorageType.AURORA_IOPT1,
      storageEncrypted: true,
      serverlessV2MinCapacity: props.minCapacity ?? 1,
      serverlessV2MaxCapacity: props.maxCapacity ?? 50,
      // cloudwatchLogsExports: engine.supportedLogTypes,
      // cloudwatchLogsRetention: RetentionDays.THREE_MONTHS,
    });

    // Enable secret rotation - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds-readme.html#rotating-credentials
    this.cluster.addRotationSingleUser();

    // TODO: [enhancement] automatically run `CREATE EXTENSION vector;`
    // @see https://aws.amazon.com/blogs/database/building-ai-powered-search-in-postgresql-using-amazon-sagemaker-and-pgvector/

    this.connectionSecret = this.cluster.secret!;

    this.proxy = this.cluster.addProxy('PrimaryProxy', {
      vpc: props.vpc,
      secrets: [this.connectionSecret],
      requireTLS: this.requireTLS,
      iamAuth: this.iamAuthentication,
      securityGroups: [this.securityGroup],
    });

    new CfnOutput(this, 'RDSVectorStore-Secret', {
      value: this.connectionSecret.secretArn,
    });

    new CfnOutput(this, 'RDSVectorStore-ProxyEndpoint', {
      value: this.proxy.endpoint,
    });

    NagSuppressions.addResourceSuppressions(
      this,
      [
        {
          id: 'AwsPrototyping-EC2RestrictedCommonPorts',
          reason: 'Default port is required for proxy; and cluster is in isolated subnet.',
        },
        {
          id: 'AwsPrototyping-EC2RestrictedInbound',
          reason: 'Inbound restricted to VPC traffic only',
        },
        {
          id: 'AwsPrototyping-EC2RestrictedSSH',
          reason: 'Only VPC inbound traffic allowed, should enable this if opening inbound',
        },
        {
          id: 'AwsPrototyping-AuroraMySQLPostgresIAMAuth',
          reason: 'Only VPC inbound traffic allowed, should enable this if opening inbound',
        },
        {
          id: 'AwsPrototyping-SecretsManagerRotationEnabled',
          reason: 'Dev stage only',
        },
        {
          id: 'AwsPrototyping-RDSStorageEncrypted',
          reason: 'Dev stage only',
        },
      ],
      true,
    );
  }

  grantConnect(grantable: IGrantable): void {
    this.connectionSecret.grantRead(grantable);
    this.proxy.grantConnect(grantable);
  }
}

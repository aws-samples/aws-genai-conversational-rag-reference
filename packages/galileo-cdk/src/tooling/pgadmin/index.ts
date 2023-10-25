/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { CfnOutput } from 'aws-cdk-lib';
import {
  ISecurityGroup,
  Port,
  SecurityGroup,
  SubnetType,
  IVpc,
} from 'aws-cdk-lib/aws-ec2';
import {
  Cluster,
  ContainerImage,
  CpuArchitecture,
  FargateService,
  FargateTaskDefinition,
  LogDrivers,
  OperatingSystemFamily,
  Protocol,
  Secret as EcsSecret,
} from 'aws-cdk-lib/aws-ecs';
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
  IApplicationLoadBalancer,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface IPgAdminProps {
  readonly vpc: IVpc;
  readonly pgSecurityGroup: ISecurityGroup;
  readonly pgAdminEmail: string;
  readonly pgPort?: number;
}

export class PgAdmin extends Construct {
  readonly securityGroup: ISecurityGroup;
  readonly pgAdminPassSecret: ISecret;
  readonly loadBalancer: IApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: IPgAdminProps) {
    super(scope, id);

    // the port pgAdmin is listening on
    // if you want to use 443, you need to feed certs to the container
    const pgAdminListenPort = 80;

    /**
     * This security group defines the data flow between Aurora Postgres and everything else.
     * IMPORTANT:
     * we are NOT opening up anything to the public from here.
     * For access, you must do it MANUALLY from the console, adding your host's IP address (or your VPN's range) for access.
     * For more details, see `Infra Tooling` docs.
     */
    const securityGroup = new SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: 'PGAdmin security group',
    });

    // allow data to from from PG's isolated subnets
    securityGroup.addIngressRule(
      props.pgSecurityGroup,
      Port.tcp(props.pgPort ?? 5432),
      'Allow Access from Aurora Postgres',
    );

    // create a secure password for pgadmin
    const pgAdminPass = new Secret(this, 'PgAdminPass', {
      description: 'PgAdmin password',
    });

    const pgAdminTask = new FargateTaskDefinition(this, 'TaskDefinition', {
      cpu: 512,
      memoryLimitMiB: 2048,
      runtimePlatform: {
        cpuArchitecture: CpuArchitecture.ARM64,
        operatingSystemFamily: OperatingSystemFamily.LINUX,
      },
    });

    pgAdminTask.addContainer('Container', {
      image: ContainerImage.fromRegistry('dpage/pgadmin4'),
      memoryReservationMiB: 1024,
      environment: {
        // required env vars
        PGADMIN_DEFAULT_EMAIL: props.pgAdminEmail,
        PGADMIN_LISTEN_PORT: `${pgAdminListenPort}`,
      },
      secrets: {
        // adding pgAdmin password as secret
        PGADMIN_DEFAULT_PASSWORD: EcsSecret.fromSecretsManager(pgAdminPass),
      },
      healthCheck: {
        command: [
          'CMD-SHELL',
          // check if localhost responds with 200
          // Note: `wget` is available in "dpage/pgadmin4" container (curl is not)
          'wget --spider -o /dev/null http://localhost || exit 1',
        ],
      },
      portMappings: [
        {
          containerPort: pgAdminListenPort,
          hostPort: pgAdminListenPort,
          protocol: Protocol.TCP,
        },
      ],
      logging: LogDrivers.awsLogs({ streamPrefix: 'pgAdmin' }),
    });

    const cluster = new Cluster(this, 'Cluster', {
      containerInsights: true,
      vpc: props.vpc,
    });

    const pgAdminService = new FargateService(this, 'Service', {
      cluster,
      desiredCount: 1,
      securityGroups: [securityGroup],
      taskDefinition: pgAdminTask,
      assignPublicIp: true,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
    });

    // setup an application load balancer
    const loadBalancer = new ApplicationLoadBalancer(this, 'ALB', {
      internetFacing: true,
      securityGroup: securityGroup,
      vpc: props.vpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
    });

    const albListener = loadBalancer.addListener('Listener', {
      open: false,
      port: pgAdminListenPort,
      protocol: ApplicationProtocol.HTTP,
    });
    albListener.connections.addSecurityGroup(securityGroup);

    albListener.addTargets('Target', {
      port: pgAdminListenPort,
      targets: [pgAdminService],
      protocol: ApplicationProtocol.HTTP,
      // ALB health check -- /login endpoint for unauthenticated requests
      healthCheck: { path: '/login' },
    });

    // save necessary parameters into CloudFormation outputs
    new CfnOutput(this, 'PgAdminSecurityGroup', {
      value: `PgAdmin security group id: ${securityGroup.securityGroupId}`,
    });

    new CfnOutput(this, 'PgAdminALBDomain', {
      value: `PgAdmin url: ${loadBalancer.loadBalancerDnsName}`,
    });

    // expose constructs
    this.securityGroup = securityGroup;
    this.pgAdminPassSecret = pgAdminPass;
    this.loadBalancer = loadBalancer;

    NagSuppressions.addResourceSuppressions(this, [
      {
        id: 'AwsPrototyping-EC2RestrictedCommonPorts',
        reason:
          'PG port is required for the security group; and the RDS cluster is in isolated subnet.',
      },
    ]);
  }
}

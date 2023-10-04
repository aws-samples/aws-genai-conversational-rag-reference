/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { CfnOutput, Stack } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnDomain, CfnUserProfile } from 'aws-cdk-lib/aws-sagemaker';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { isDevStage } from '../../../common/utils';

export interface ISageMakerStudioProps {
  readonly vpc: ec2.IVpc;
  readonly domainName: string;
  readonly users?: string[];
  readonly subnetIds?: string[];
}

export class SageMakerStudio extends Construct {
  readonly userRole: Role;
  readonly domain: CfnDomain;
  readonly users: { [key: string]: CfnUserProfile };

  constructor(scope: Construct, id: string, props: ISageMakerStudioProps) {
    super(scope, id);

    const region = Stack.of(this).region;

    const vpcSecurityGroup = new ec2.SecurityGroup(this, 'VPCSecurityGroup', {
      vpc: props.vpc,
      description: 'Allow tcp traffic self-ref',
      allowAllOutbound: true,
    });
    vpcSecurityGroup.addIngressRule(
      vpcSecurityGroup,
      ec2.Port.allTcp(),
      'self-ref',
    );

    const vpcepSecurityGroup = new ec2.SecurityGroup(
      this,
      'VPCEPSecurityGroup',
      {
        vpc: props.vpc,
        description: 'Allow https from vpc sg',
        allowAllOutbound: true,
      },
    );
    vpcepSecurityGroup.addIngressRule(
      vpcSecurityGroup,
      ec2.Port.tcp(443),
      'https from vpc sg',
    );

    new ec2.InterfaceVpcEndpoint(this, 'SM API VPC Endpoint', {
      vpc: props.vpc,
      service: new ec2.InterfaceVpcEndpointService(
        `com.amazonaws.${region}.sagemaker.api`,
        443,
      ),
      privateDnsEnabled: true,
    });

    new ec2.InterfaceVpcEndpoint(this, 'Studio VPC Endpoint', {
      vpc: props.vpc,
      service: new ec2.InterfaceVpcEndpointService(
        `aws.sagemaker.${region}.studio`,
        443,
      ),
      privateDnsEnabled: true,
    });

    const vpcPrivateSubnetsId = props.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    }).subnetIds;

    this.userRole = new Role(this, 'UserRole', {
      assumedBy: new ServicePrincipal('sagemaker.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'), // <- needed for developers to deploy
      ],
    });

    this.domain = new CfnDomain(this, 'Domain', {
      authMode: 'IAM',
      appNetworkAccessType: 'VpcOnly',
      vpcId: props.vpc.vpcId,
      subnetIds: [...vpcPrivateSubnetsId, ...(props.subnetIds || [])],
      domainName: props.domainName,
      defaultUserSettings: {
        executionRole: this.userRole.roleArn,
        securityGroups: [vpcSecurityGroup.securityGroupId],
      },
    });

    this.users = Object.fromEntries(
      (props.users || ['developers']).map((user) => {
        return [
          user,
          new CfnUserProfile(this, `User-${user}`, {
            domainId: this.domain.attrDomainId,
            userProfileName: user,
            userSettings: {
              executionRole: this.userRole.roleArn,
              securityGroups: [vpcSecurityGroup.securityGroupId],
            },
          }),
        ];
      }),
    );

    new CfnOutput(this, 'StudioDomainId', { value: this.domain.attrDomainId });
    new CfnOutput(this, 'StudioJupyterUrl', {
      value: `${this.domain.attrUrl}/jupyter/default`,
    });
    new CfnOutput(this, 'StudioUsers', {
      value: JSON.stringify(
        Object.fromEntries(
          Object.entries(this.users).map(([k, v]) => [k, v.attrUserProfileArn]),
        ),
      ),
    });

    if (isDevStage(this)) {
      NagSuppressions.addResourceSuppressions(
        [vpcSecurityGroup, vpcepSecurityGroup],
        [
          {
            id: 'AwsPrototyping-EC2RestrictedSSH',
            reason:
              '[Dev Stage] VPC inbound traffic only, will address before suppressing beyond dev stage.',
          },
          {
            id: 'AwsPrototyping-EC2RestrictedInbound',
            reason: '[Dev Stage] VPC inbound traffic only.',
          },
          {
            id: 'AwsPrototyping-EC2RestrictedCommonPorts',
            reason:
              '[Dev Stage] VPC inbound traffic only, will address before suppressing beyond dev stage.',
          },
        ],
      );
    }
  }
}

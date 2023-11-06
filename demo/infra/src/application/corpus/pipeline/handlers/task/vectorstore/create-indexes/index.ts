/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import path from 'node:path';
import { RDSVectorStore } from '@aws/galileo-cdk/lib/data';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { IRole } from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as esbuild from 'esbuild';

const IMAGE_DIR = path.join(__dirname, 'image');

export interface VectorStoreCreateIndexTaskProps {
  readonly vpc: ec2.IVpc;
  readonly vectorStore: RDSVectorStore;
  readonly additionalEnvironment?: Record<string, string>;
}

export class VectorStoreCreateIndexTask extends Construct {
  readonly task: tasks.EcsRunTask;
  readonly taskRole: IRole;

  constructor(scope: Construct, id: string, props: VectorStoreCreateIndexTaskProps) {
    super(scope, id);

    const { vpc, vectorStore } = props;

    const cluster = new ecs.Cluster(this, 'FargateCluster', { vpc });

    const taskDefinition = new ecs.TaskDefinition(this, 'ECSTaskDefinition', {
      memoryMiB: '1024',
      cpu: '512',
      compatibility: ecs.Compatibility.FARGATE,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });
    this.taskRole = taskDefinition.taskRole;
    vectorStore.grantConnect(this.taskRole);

    esbuild.buildSync({
      bundle: true,
      platform: 'node',
      entryPoints: [path.join(__dirname, 'handler.ts')],
      outfile: path.join(IMAGE_DIR, 'index.js'),
      sourcemap: true,
      minify: false,
    });

    const containerDefinition = taskDefinition.addContainer('TaskContainer', {
      image: ecs.ContainerImage.fromAsset(IMAGE_DIR, {
        platform: Platform.LINUX_ARM64,
      }),
      memoryLimitMiB: 256,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'corpus-pipeline-indexing',
      }),
    });

    this.task = new tasks.EcsRunTask(this, id + 'Runner', {
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
      cluster,
      taskDefinition,
      containerOverrides: [
        {
          containerDefinition,
          environment: Object.entries({
            ...vectorStore.environment,
            ...props.additionalEnvironment,
          }).map(([name, value]) => {
            return { name, value };
          }),
        },
      ],
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [vectorStore.securityGroup],
      resultPath: sfn.JsonPath.DISCARD,
      launchTarget: new tasks.EcsFargateLaunchTarget(),
      propagatedTagSource: ecs.PropagatedTagSource.TASK_DEFINITION,
    });
  }
}

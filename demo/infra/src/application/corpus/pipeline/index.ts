/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { ServiceQuotas, SecureBucket } from "@aws/galileo-cdk/lib/common";
import { ApplicationContext } from "@aws/galileo-cdk/lib/core/app";
import { RDSVectorStore } from "@aws/galileo-cdk/lib/data";
import {
  ArnFormat,
  CfnOutput,
  Duration,
  RemovalPolicy,
  Size,
  Stack,
} from "aws-cdk-lib";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { IVpc, Port, SecurityGroup, SubnetType } from "aws-cdk-lib/aws-ec2";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { SfnStateMachine } from "aws-cdk-lib/aws-events-targets";
import {
  Effect,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Architecture, DockerImageCode, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { IBucket } from "aws-cdk-lib/aws-s3";
import {
  Choice,
  Condition,
  CustomState,
  DefinitionBody,
  JsonPath,
  StateMachine,
  Succeed,
  TaskInput,
} from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { State, StatePaths } from "./types";

const PROCESSING_INPUT_LOCAL_PATH = "/opt/ml/processing/input_data";

export interface IndexingPipelineOptions {
  /**
   * SageMaker Processing Job instance type
   * @default "ml.g4dn.2xlarge"
   * @see https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ProcessingClusterConfig.html#sagemaker-Type-ProcessingClusterConfig-InstanceType
   */
  readonly instanceType?: string;
  /**
   * The max number of container instances to use for indexing job
   * @default 5
   */
  readonly maxInstanceCount?: number;
  /**
   * Target number of files to process per container. Used to infer the number of containers
   * to use based on number of files to index.
   * @default 5000
   */
  readonly targetContainerFilesCount?: number;
  readonly scheduled?: boolean;
  readonly scheduleDuration?: Duration;
}

export interface IndexingPipelineProps extends IndexingPipelineOptions {
  readonly vpc: IVpc;
  readonly cacheTable: Table;
  readonly inputBucket: IBucket;
  readonly inputBucketPrefix?: string;
  readonly vectorStore: RDSVectorStore;
  readonly dockerImagePath: string;
  readonly dockerImageSize?: Size;
}

export class IndexingPipeline extends Construct {
  readonly stateMachine: StateMachine;

  constructor(scope: Construct, id: string, props: IndexingPipelineProps) {
    super(scope, id);

    const instanceType = props.instanceType ?? "ml.g4dn.2xlarge";

    const {
      inputBucket,
      inputBucketPrefix,
      cacheTable,
      vectorStore,
      vpc,
      maxInstanceCount = 5,
      targetContainerFilesCount = 5000,
      dockerImageSize = Size.gibibytes(6),
    } = props;

    const executionDelay = props.scheduleDuration || Duration.hours(1);

    // Bucket for storing input bucket manifest and other staging artifacts
    const stagingBucket = new SecureBucket(this, "StagingBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const startState: State = {
      ["StateMachine.$" as "StateMachine"]: "$$.StateMachine" as any,
      ["Execution.$" as "Execution"]: "$$.Execution" as any,
      DockerImageSizeInGB: dockerImageSize.toGibibytes(),
      InputBucket: {
        Bucket: inputBucket.bucketName,
        Prefix: inputBucketPrefix,
      },
      StagingBucket: {
        Bucket: stagingBucket.bucketName,
      },
      InstanceType: instanceType,
      LocalPath: PROCESSING_INPUT_LOCAL_PATH,
      MaxContainerInstanceCount: maxInstanceCount,
      TargetContainerFilesCount: targetContainerFilesCount,
      SubsequentExecutionDelay: executionDelay.toMinutes(),
      Environment: {
        // Available envs are defined in demo/corpus/logic/src/env.ts
        ...ApplicationContext.getPowerToolsEnv(this),
        ...vectorStore.environment,
        INDEXING_BUCKET: props.inputBucket.bucketName,
        INDEXING_CACHE_TABLE: props.cacheTable.tableName,
        // Config task already optimizes the s3 objects (bulk or manifest) so no need to check in container
        INDEXING_SKIP_DELTA_CHECK: "1",
        AWS_DEFAULT_REGION: Stack.of(this).region,
      },
    };

    ///////////////////////////////////////////////////////////////////////////////////////
    // TASK: Start - define init state (merge defaults with input) and check if already running
    ///////////////////////////////////////////////////////////////////////////////////////
    // Task for checking if a machine is already running
    const startTaskLambda = new NodejsFunction(this, "StartTaskLambda", {
      entry: require.resolve("./handlers/task/start"),
      runtime: Runtime.NODEJS_18_X,
      initialPolicy: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "states:ListStateMachines",
            "states:ListActivities",
            "states:DescribeStateMachine",
            "states:DescribeStateMachineForExecution",
            "states:ListExecutions",
            "states:DescribeExecution",
            "states:GetExecutionHistory",
            "states:DescribeActivity",
          ],
          resources: ["*"],
        }),
      ],
    });

    const startTask = new tasks.LambdaInvoke(this, "StartTask", {
      lambdaFunction: startTaskLambda,
      payloadResponseOnly: true,
      payload: TaskInput.fromObject(startState),
      resultPath: "$",
    });

    ///////////////////////////////////////////////////////////////////////////////////////
    // TASK: Processing Job Config
    ///////////////////////////////////////////////////////////////////////////////////////
    // Task to infer processing job options
    const configLambda = new NodejsFunction(this, "ConfigTaskLambda", {
      entry: require.resolve("./handlers/task/config"),
      runtime: Runtime.NODEJS_18_X,
      environment: {
        ...vectorStore.environment,
        PROCESSING_INPUT_LOCAL_PATH,
        INDEXING_BUCKET: props.inputBucket.bucketName,
        INDEXING_CACHE_TABLE: props.cacheTable.tableName,
      },
      timeout: Duration.minutes(1),
      memorySize: 256,
    });

    props.inputBucket.grantRead(configLambda);
    props.cacheTable.grantReadData(configLambda);
    stagingBucket.grantReadWrite(configLambda);

    const configTask = new tasks.LambdaInvoke(this, "ConfigTask", {
      lambdaFunction: configLambda,
      payloadResponseOnly: true,
      resultPath: StatePaths.ProcessingJobConfig,
    });

    ///////////////////////////////////////////////////////////////////////////////////////
    // TASK: Create Processing Job
    ///////////////////////////////////////////////////////////////////////////////////////
    const sagemakerSecurityGroup = new SecurityGroup(
      this,
      "SagemakerSecurityGroup",
      {
        allowAllOutbound: true,
        vpc,
      }
    );
    sagemakerSecurityGroup.addIngressRule(
      sagemakerSecurityGroup,
      Port.allTraffic()
    );
    NagSuppressions.addResourceSuppressions(
      sagemakerSecurityGroup,
      [
        {
          id: "AwsPrototyping-EC2RestrictedCommonPorts",
          reason:
            "SecurityGroup granting access to itself only and is in VPC, so all ports are ok for development",
        },
        {
          id: "AwsPrototyping-EC2RestrictedInbound",
          reason: "Inbound traffic restricted to the security group itself",
        },
      ],
      true
    );

    const processingJobRole = new Role(this, "ProcessingRole", {
      assumedBy: new ServicePrincipal("sagemaker.amazonaws.com"),
      inlinePolicies: {
        Logging: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                "cloudwatch:PutMetricData",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:CreateLogGroup",
                "logs:DescribeLogStreams",
              ],
              resources: ["*"],
            }),
          ],
        }),
        SageMaker: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                "ec2:CreateNetworkInterface",
                "ec2:CreateNetworkInterfacePermission",
                "ec2:CreateVpcEndpoint",
                "ec2:DeleteNetworkInterface",
                "ec2:DeleteNetworkInterfacePermission",
                "ec2:DescribeDhcpOptions",
                "ec2:DescribeNetworkInterfaces",
                "ec2:DescribeRouteTables",
                "ec2:DescribeSecurityGroups",
                "ec2:DescribeSubnets",
                "ec2:DescribeVpcEndpoints",
                "ec2:DescribeVpcs",
              ],
              resources: ["*"],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                "ecr:BatchCheckLayerAvailability",
                "ecr:BatchGetImage",
                "ecr:CreateRepository",
                "ecr:Describe*",
                "ecr:GetAuthorizationToken",
                "ecr:GetDownloadUrlForLayer",
                "ecr:StartImageScan",
              ],
              resources: ["*"],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                "states:DescribeExecution",
                "states:GetExecutionHistory",
                "states:StartExecution",
                "states:StopExecution",
                "states:UpdateStateMachine",
              ],
              resources: [
                Stack.of(this).formatArn({
                  arnFormat: ArnFormat.COLON_RESOURCE_NAME,
                  service: "states",
                  resource: "statemachine",
                  resourceName: "*sagemaker*",
                }),
                Stack.of(this).formatArn({
                  arnFormat: ArnFormat.COLON_RESOURCE_NAME,
                  service: "states",
                  resource: "execution",
                  resourceName: "*sagemaker*:*",
                }),
              ],
            }),
          ],
        }),
      },
    });

    inputBucket.grantRead(processingJobRole);
    stagingBucket.grantReadWrite(processingJobRole);
    vectorStore.connectionSecret.grantRead(processingJobRole);
    cacheTable.grantReadWriteData(processingJobRole);

    const dockerImageCode = DockerImageCode.fromImageAsset(
      props.dockerImagePath,
      {
        // Sagemaker processing jobs only support AMD64
        platform: Platform.LINUX_AMD64,
        cmd: ["sagemaker"],
      }
    );

    // Bind the image to role to ensure gets published and role is granted read access
    const dockerImageUri = dockerImageCode
      ._bind(Architecture.X86_64)
      .bind(processingJobRole).image!.imageUri;

    const sagemakerProcessingJobTask = new CustomState(
      this,
      "SageMakerProcessingJobTask",
      {
        // https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateProcessingJob.html
        stateJson: {
          Type: "Task",
          Resource: "arn:aws:states:::sagemaker:createProcessingJob.sync",
          Parameters: {
            ProcessingResources: {
              "ClusterConfig.$": StatePaths.ClusterConfig,
            },
            ProcessingInputs: [
              {
                InputName: "corpus",
                "S3Input.$": StatePaths.S3Input,
              },
            ],
            NetworkConfig: {
              EnableNetworkIsolation: false,
              VpcConfig: {
                Subnets: vpc.privateSubnets.map((subnet) => subnet.subnetId),
                SecurityGroupIds: [sagemakerSecurityGroup.securityGroupId],
              },
            },
            AppSpecification: {
              ImageUri: dockerImageUri,
              // Corpus docker entry already defined, just need to define target of "sagemaker"
              ContainerArguments: ["sagemaker"],
            },
            StoppingCondition: {
              MaxRuntimeInSeconds: 30000,
            },
            "Environment.$": StatePaths.Environment,
            RoleArn: processingJobRole.roleArn,
            "ProcessingJobName.$": "States.UUID()",
          },
          ResultPath: null,
        },
      }
    );

    ///////////////////////////////////////////////////////////////////////////////////////
    // TASK: Vector Store - setup + indexing
    ///////////////////////////////////////////////////////////////////////////////////////
    const vectorStoreSetupTaskLambda = new NodejsFunction(
      this,
      "VectorStoreSetupTaskLambda",
      {
        entry: require.resolve("./handlers/task/vectorstore/setup"),
        runtime: Runtime.NODEJS_18_X,
        timeout: Duration.minutes(5),
        vpc,
        vpcSubnets: {
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        environment: {
          ...vectorStore.environment,
        },
      }
    );
    vectorStore.grantConnect(vectorStoreSetupTaskLambda);
    const vectorStoreSetupTask = new tasks.LambdaInvoke(
      this,
      "VectorStoreSetupTasK",
      {
        lambdaFunction: vectorStoreSetupTaskLambda,
        resultPath: JsonPath.DISCARD,
      }
    );

    const vectorStoreIndexTaskLambda = new NodejsFunction(
      this,
      "VectorStoreIndexTaskLambda",
      {
        entry: require.resolve("./handlers/task/vectorstore/create-indexes"),
        runtime: Runtime.NODEJS_18_X,
        timeout: Duration.minutes(15),
        vpc,
        vpcSubnets: {
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        environment: {
          ...vectorStore.environment,
        },
      }
    );
    vectorStore.grantConnect(vectorStoreIndexTaskLambda);
    const vectorStoreIndexTask = new tasks.LambdaInvoke(
      this,
      "VectorStoreIndexTasK",
      {
        lambdaFunction: vectorStoreIndexTaskLambda,
        resultPath: JsonPath.DISCARD,
      }
    );

    ///////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////
    // State Machine - chain flow
    ///////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////
    const runProcessingJobChain = vectorStoreSetupTask
      .next(sagemakerProcessingJobTask)
      .next(vectorStoreIndexTask);

    const cancelState = new Succeed(this, "Cancelled");

    const isRunningCheck = new Choice(this, "IsRunningCheck", {
      comment: "Is running?",
    })
      .when(Condition.booleanEquals(StatePaths.IsRunning, false), configTask)
      .otherwise(cancelState);

    const shouldRunProcessingJobCheck = new Choice(
      this,
      "ShouldRunProcessingJobCheck",
      { comment: "Should run processing job?" }
    )
      .when(
        Condition.booleanEquals(StatePaths.DoRunProcessingJob, true),
        runProcessingJobChain
      )
      .otherwise(cancelState);

    configTask.next(shouldRunProcessingJobCheck);

    ///////////////////////////////////////////////////////////////////////////////////////
    // State Machine
    ///////////////////////////////////////////////////////////////////////////////////////
    const stepFunctionsRole = new Role(this, "StepFunctionsRole", {
      assumedBy: new ServicePrincipal("states.amazonaws.com"),
      inlinePolicies: {
        Common: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                "xray:PutTraceSegments",
                "xray:PutTelemetryRecords",
                "xray:GetSamplingRules",
                "xray:GetSamplingTargets",
                "events:PutTargets",
                "events:DescribeRule",
                "events:PutRule",
                "iam:PassRole",
              ],
              resources: ["*"],
            }),
          ],
        }),
        SageMaker: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                "sagemaker:CreateProcessingJob",
                "sagemaker:DescribeProcessingJob",
                "sagemaker:StopProcessingJob",
                "sagemaker:ListTags",
                "sagemaker:AddTags",
              ],
              resources: [
                Stack.of(this).formatArn({
                  service: "sagemaker",
                  resource: "processing-job",
                  resourceName: "*",
                }),
              ],
            }),
          ],
        }),
      },
    });

    stagingBucket.grantReadWrite(stepFunctionsRole);

    const start = startTask.next(isRunningCheck);

    this.stateMachine = new StateMachine(this, "StateMachine", {
      definitionBody: DefinitionBody.fromChainable(start),
      role: stepFunctionsRole,
    });

    new CfnOutput(this, "PipelineStateMachine", {
      value: this.stateMachine.stateMachineArn,
    });

    if (props.scheduled) {
      new Rule(this, "ScheduleRule", {
        schedule: Schedule.rate(executionDelay),
        targets: [new SfnStateMachine(this.stateMachine)],
        description: "Corpus indexing pipeline schedule rule",
      });
    }

    ServiceQuotas.addRequirement(this.stateMachine, {
      serviceCode: "sagemaker",
      quotaName: `${instanceType} for processing job usage`,
      minimumValue: maxInstanceCount,
    });

    NagSuppressions.addResourceSuppressions(
      [stepFunctionsRole, processingJobRole],
      [
        {
          id: "AwsPrototyping-IAMNoWildcardPermissions",
          reason:
            "IAM actions already sufficiently scope to least-privileged and specific resources parts with wildcards are dynamic",
          appliesTo: ["Resource::*"],
        },
      ],
      true
    );

    NagSuppressions.addResourceSuppressions(
      this,
      [
        {
          id: "AwsPrototyping-IAMNoManagedPolicies",
          reason:
            "StateMachine lambdas use default managed policy AWSLambdaBasicExecutionRole",
        },
        {
          id: "AwsPrototyping-IAMNoWildcardPermissions",
          reason: "StateMachine lambda operate on dynamic resources",
          appliesTo: ["Resource::*"],
        },
      ],
      true
    );
  }
}

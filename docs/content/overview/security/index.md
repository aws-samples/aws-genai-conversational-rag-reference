# Security considerations

> The sample code; software libraries; command line tools; proofs of concept; templates; or other related technology (including any of the foregoing that are provided by our personnel) is provided to you as AWS Content under the AWS Customer Agreement, or the relevant written agreement between you and AWS (whichever applies). You should not use this AWS Content in your production accounts, or on production or other critical data. You are responsible for testing, securing, and optimizing the AWS Content, such as sample code, as appropriate for production grade use based on your specific quality control practices and standards. Deploying AWS Content may incur AWS charges for creating or using AWS chargeable resources, such as running Amazon EC2 instances or using Amazon S3 storage.

This code is provided as a sample and is under active development, so care should be taken when working with sensitive data handled by the deployed application. Please ensure a comprehensive [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html) review against the specific use case and data before using in production and/or with potentially sensitive data.

## Data protection

The current vector storage (Aurora Postgres) uses default ports, username, and a single master secret without rotation enabled. The cluster is only accessible from within the application VPC which reduces the attack service, however additional hardening of the security posture should be taken before storing sensitive data in the database.

> During deployment, you will be notified of these concerns via [PDK Nag](https://github.com/aws/aws-pdk/blob/mainline/packages/pdk-nag/src/packs/README.md#rules) warnings in the console:
> `AwsPrototyping-AuroraMySQLPostgresIAMAuth`, `AwsPrototyping-SecretsManagerRotationEnabled`

## Amazon SageMaker Studio

In development stage, the application deploys an [Amazon SageMaker Studio](https://aws.amazon.com/sagemaker/studio/) domain and user profile that has broad access to many of the resources deployed by the application, along with [SagemakerFullAccess](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonSageMakerFullAccess.html) managed policy. The access is designed to allow rapid deployment and testing of models against the application from within Notebooks without requiring application code modification and deployment. Considerations should be taken when granting users access to this development account and the user profile provided, in addition to implementing stronger least-privileged permissions based on your actual use case and needs.

> During deployment, you will be notified of this concern via [PDK Nag](https://github.com/aws/aws-pdk/blob/mainline/packages/pdk-nag/src/packs/README.md#rules) warning in the console:
> `AwsPrototyping-IAMNoManagedPolicies[Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonSageMakerFullAccess]`

## Network accessibility

By default the [WebACL](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl.html) associated with the CloudFront distribution is does not apply geo restriction. You’d need to modify the configuration of the CDK application to apply geo restrictions.

## Authentication

The default configuration uses [Amazon Cognito](https://aws.amazon.com/cognito/) authentication to control website and api access. The default configuration deploys a [User pool](https://docs.aws.amazon.com/cognito/latest/developerguide/what-is-amazon-cognito.html#what-is-amazon-cognito-user-pools) configured with Multi-Factor Authentication (MFA) and does not allow sign-up. The application creates an _Administrator_ group with elevated permissions to perform additional functionality with the api, such as modifying the inference engine configuration at runtime. When expanding the permissions of the _Administrator_ group and the users that belong to it, extra care should be taken.

## Content Security Policy

This reference includes a simple CSP ([Content Security Policy](https://en.wikipedia.org/wiki/Content_Security_Policy)) that should be customized to your needs and use-case. Currently the CSP allows images loaded from any source (`img-src: *`), and fetching data from any api (`connect-src: *`).

## Importing content

You should only import content, such as sample corpus data, from sources that you trust.

## CloudFront Security Policy

When using the default CloudFront domain and certificate (\*.[cloudfront.net](http://cloudfront.net/)), CloudFront automatically sets the security policy to [TLSv1](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/secure-connections-supported-viewer-protocols-ciphers.html). It’s recommended that you use a [custom domain](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html) and certificate with the CloudFront distribution and configure it to use use a [Security Policy](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/secure-connections-supported-viewer-protocols-ciphers.html) that does not allow older protocols such as TLS 1.0. Consider using the `TLSv1.2_2021` Security Policy.

## SageMaker AmazonSageMakerFullAccess Policy

AmazonSageMakerFullAccess is required to when you configure the deployment to use the development tools. It is recommended deployments intended for use beyond development and evaulation not include these development tools, as this managed policy is broad. See the [documentation](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonSageMakerFullAccess.html) of this policy for additional details.

## AWS Well-Architected Framework

The [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html) helps you understand the pros and cons of decisions you make while building systems on AWS. By using the Framework you will learn architectural best practices for designing and [operating](https://docs.aws.amazon.com/wellarchitected/latest/framework/operational-excellence.html) [reliable](https://docs.aws.amazon.com/wellarchitected/latest/framework/reliability.html), [secure](https://docs.aws.amazon.com/wellarchitected/latest/framework/security.html), [efficient](https://docs.aws.amazon.com/wellarchitected/latest/framework/performance-efficiency.html), [cost-effective](https://docs.aws.amazon.com/wellarchitected/latest/framework/cost-optimization.html), and [sustainable](https://docs.aws.amazon.com/wellarchitected/latest/framework/sustainability.html) systems in the cloud.

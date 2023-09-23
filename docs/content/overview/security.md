# Security Considerations

The sample code; software libraries; command line tools; proofs of concept; templates; or other related technology (including any of the foregoing that are provided by our personnel) is provided to you as AWS Content under the AWS Customer Agreement, or the relevant written agreement between you and AWS (whichever applies). You should not use this AWS Content in your production accounts, or on production or other critical data. You are responsible for testing, securing, and optimizing the AWS Content, such as sample code, as appropriate for production grade use based on your specific quality control practices and standards. Deploying AWS Content may incur AWS charges for creating or using AWS chargeable resources, such as running Amazon EC2 instances or using Amazon S3 storage.

## Authentication

In the default configuration there is no authentication to reach the static web assets. You should integrate this with whatever identity management solution you currently use. To add authentication you would need to customise this application. One approach you could consider is to create a Lambda@Edge function to enforce authentication and associated cookie validation, then attach this function to the Amazon CloudFront distribution to protect the static web assets (see ‘Configuration’ section). You’d especially want to consider this if you modify the sample application to include your own data, such as example threat statements.

## Vulnerability management

Like all software, it’s important that you have an on-going process in place to ensure that you are performing vulnerability management of the code included in this package and all of it’s dependencies. In this GitHub repository, we leverage dependabot security alerts and dependabot security updates to detect and update vulnerable dependencies.

Watch this repository for updates and deploy the latest changes. See ‘Maintenance’ section for each Deployment option below on how to deploy the latest changes.

## Content Security Policy

This tool includes a simple CSP (Content Security Policy) that should be customised to your needs and use-case. Consider strengthening CSP implemented in "index.html" by either 1) scoping it to the actual API Gateway non-custom domain, or 2) using a custom domain for both front-end and API and scope it to "self").  

## CloudFront Security Policy

When using the default CloudFront domain and certificate (*.cloudfront.net), CloudFront automatically sets the security policy to TLSv1. It’s recommended that you use a custom domain and certificate with the CloudFront distribution and configure it to use use a Security Policy that does not allow older protocols such as TLS 1.0. Consider using the TLSv1.2_2021 Security Policy.
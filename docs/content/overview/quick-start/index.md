# Getting Started

## Prerequisites

*Development Environment:*

|   Tool                |   Version   |    Recommendation            |
| --------------------- | ----------- | ---------------------------- |
| pnpm                  | >=8.x       | https://pnpm.io/installation |
| NodeJS                | >=18        | Use Node Version Manager ([nvm](https://github.com/nvm-sh/nvm)) |
| Python                | >=3.10,<4   | Use Python Version Manager ([pyenv](https://github.com/pyenv/pyenv)) |
| Poetry                | >=1.5,<2    | https://python-poetry.org/docs/ |
| AWS CLI               | v2          | https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html |
| Docker[^1] | v20+     | https://docs.docker.com/desktop/ |
| JDK                   | v17+        | [Amazon Corretto 17](https://docs.aws.amazon.com/corretto/latest/corretto-17-ug/downloads-list.html) |

[^1]: Docker virtual disk space should have at least 30GB of free space. If you see `no space left on device` error during build, free up space by running `docker system prune -f` and/or increasing the virtual disk size.

*AWS Service Quotas:*
!!! warning "Service Quota Requirements"
    Ensure the necessary service quota limits are increased based on your configuration before deploying. The deployment performs a check and will fail early if limits are not met.

| Service | Quota | Minimum Applied Value | Usage | Region |
| --- | --- | --- | --- | --- |
| [SageMaker](https://console.aws.amazon.com/servicequotas/home/services/sagemaker/quotas) | `ml.g5.12xlarge for endpoint usage`        | 1                     | Falcon Lite            | LLM    |
| [SageMaker](https://console.aws.amazon.com/servicequotas/home/services/sagemaker/quotas) | `ml.g5.16xlarge for endpoint usage`        | 1                     | Falcon 7B              | LLM    |
| [SageMaker](https://console.aws.amazon.com/servicequotas/home/services/sagemaker/quotas) | `ml.g5.48xlarge for endpoint usage`        | 1                     | Falcon 40B             | LLM    |
| [SageMaker](https://console.aws.amazon.com/servicequotas/home/services/sagemaker/quotas) | `ml.g4dn.2xlarge for processing job usage` | 5                     | Embedding/Indexing ETL | App    |


!!! tip "Cross-Region Deployments"
    Galileo CLI enables you to deploy your LLM stack and application stack into different regions.

---

## Quick Start

Quickly deploy the full solution using the following:

> * Make sure docker is running! And with sufficient virtual disk space.
> * Make sure your AWS credentials are setup and available in the shell.

### CLI
!!! tip "Recommended basic development for individuals, developer account, trials, and demos"

Use the companion cli for deploying the cdk infra


```sh
pnpm install
pnpm run galileo-cli
# Follow the prompt from the cli to build and deploy what you want
```

> `pnpm run galileo-cli --help` for cli help info

### Manually
!!! tip "Recommended for full control and modification"

```sh
pnpm install
pnpm build

cd demo/infra
pnpm exec cdk deploy --app cdk.out --require-approval never Dev/Galileo
pnpm exec cdk deploy --app cdk.out --require-approval never Dev/Galileo-SampleDataset # (optional)
```

### CI/CD pipeline
!!! tip "Recommended for live services and for shared team accounts"

1. Create a CodeCommit repository in your target account/region name "galileo"
1. Push this git repository to the `mainline` branch
1. Run `pnpm run deploy:pipeline`

> Make sure your AWS credentials in your shell are correct

## What is deployed?

![](../../assets/images/galileo-arch.png)

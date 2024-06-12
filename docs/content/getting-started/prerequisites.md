## Deployment prerequisites

Before you start the deployment, review your development environment and tools, your AWS Service Quotas, and access to Amazon Bedrock models.

### Development environment and tools

|   Tool                |   Version   |    Recommendation            |
| --------------------- | ----------- | ---------------------------- |
| pnpm                  | >=8 <9      | Use [these instructions](https://pnpm.io/installation) to install `pnpm`
| NodeJS                | >=18        | Use Node Version Manager ([nvm](https://github.com/nvm-sh/nvm))
| Python                | >=3.10,<4   | Use Python Version Manager ([pyenv](https://github.com/pyenv/pyenv))
| Poetry                | >=1.5,<2    | <https://python-poetry.org/docs/>
| AWS CLI               | v2          | <https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html>
| Docker[^1] | v20+     | <https://docs.docker.com/desktop/>
| JDK                   | v17+        | [Amazon Corretto 17](https://docs.aws.amazon.com/corretto/latest/corretto-17-ug/downloads-list.html)

[^1]: Docker virtual disk space should have at least 30GB of free space. If you see `no space left on device` error during build, free up space by running `docker system prune -f` and/or increasing the virtual disk size.

### AWS Service Quotas

Ensure the necessary service quota limits are increased *based on your configuration* before deploying. The deployment performs a check and will fail early if limits are not met.

!!! warning Minimum Service Quota Requirements
    The embedding model usage is required for all deployments at this time, and must be 5 unless you configure it differently in the code.

    SageMaker processing job quota [ml.g4dn.2xlarge for processing job usage](https://console.aws.amazon.com/servicequotas/home/services/sagemaker/quotas) must be `>= 5`. This is required for current bulk processing of the dataset into vectorstore.

#### Quota limits for predefined models

For predefined models, check the instance type to determine the quota limits you need to increase.

??? abstract "Predefined Model"
    --8<-- "developer-guide/models/predefined-models.md"

If you only deploy the *Falcon Lite* predefined model, then you only need to ensure `ml.g5.12xlarge for endpoint usage >= 1`, while the other quotas of *X for endpoint usage* can remain 0. With the exception of below minimum requirements.

### Access to Amazon Bedrock models

!!! tip "Request access to Bedrock models"
    --8<-- "developer-guide/models/bedrock-models.md"

## Next steps

- [Deploy the Galileo Generative AI Reference Sample](deploying-galileo.md)

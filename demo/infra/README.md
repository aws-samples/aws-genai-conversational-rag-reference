# replace this


## TODO: Document Context Flags
```
  export enum Keys {
    APPLICATION_NAME = "ApplicationName",
    WEBSITE_CONTENT_PATH = "WebsiteContentPath",
    CORPUS_ETL_DOCKER_PATH = "CorpusEltDockerPath",
    DEPLOY_SAMPLE_DATASET = "DeploySampleDataset",
    FOUNDATION_MODEL_REGION = "FoundationModelRegion",
    GEO_RESTRICTION = "GeoRestriction",
    CHAT_DOMAIN = "ChatDomain",
    FOUNDATION_MODEL_CROSS_ACCOUNT_ROLE_ARN = "FoundationModelCrossAccountRoleArn",
    DECOUPLE_STACKS = "DecoupleStacks",
  }
```

## TODO: Document Sandbox development
- context flags
- cross-account role
- updating role... etc

Deploy only the main application stack (Dev/Galileo)
```
pnpm exec cdk deploy --profile {profile} --region {region} -c DecoupleStacks=1 Dev/Galileo
```

Add cross-account support to call the primary dev account FoundationModel stack models from sandbox account
```
pnpm exec cdk deploy --profile {profile} --region {region} -c DecoupleStacks=1 -c FoundationModelCrossAccountRoleArn=arn:aws:iam::{primary-account}:role/Galileo-FoundationModel-CrossAccount-{hash} Dev/Galileo
```

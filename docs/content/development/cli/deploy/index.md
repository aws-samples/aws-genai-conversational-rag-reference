# Deployment with the CLI

To run the deployment script, use the following command:

```sh
pnpm run galileo-cli deploy
```

The CLI will walk you through setting up your deployment configuration interactively.

If you have a `config.json` already defined, you can use `--skipConfirmations` and `--replay` flags (see `--help`).

> Note: The configuration schema is defined in the `ApplicationConfig` interface in `packages/galileo-cdk/src/core/app/context/types.ts`.

A typical configuration looks as follows (example):

```json
{
  "app": {
    "name": "Galileo"
  },
  "identity": {
    "admin": {
      "email": "admin@example.com",
      "username": "admin"
    }
  },
  "bedrock": {
    "enabled": true,
    "region": "us-east-1",
    "models": [
      "anthropic.claude-v2"
    ]
  },
  "llms": {
    "defaultModel": "bedrock::anthropic.claude-v2",
    "predefined": {
      "sagemaker": []
    },
    "region": "us-east-1"
  },
  "rag": {
    "managedEmbeddings": {
      "instanceType": "ml.g4dn.xlarge",
      "embeddingsModels": [
        {
          "uuid": "all-mpnet-base-v2",
          "modelId": "sentence-transformers/all-mpnet-base-v2",
          "dimensions": 768,
          "modelRefKey": "all-mpnet-base-v2",
          "default": true
        }
      ]
    },
    "indexing": {
      "pipeline": {
        "instanceType": "ml.t3.large",
        "maxInstanceCount": 5,
        "createVectorStoreIndexes": false
      }
    }
  },
  "tooling": {
    "sagemakerStudio": false,
    "pgadmin": true
  }
}
```

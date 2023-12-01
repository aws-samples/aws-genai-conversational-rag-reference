# Foundation Models

--8<-- "disclaimer/third-party-model.md"

## Predefined Models

Galileo supports a number of predefined large language models (LLMs), including all available non-embeddings text-to-text models provided by Bedrock, and a number of SageMaker JumpStart models (Falcon40b, Falcon7b, Falcon Lite, Jurassic Ultra, and Meta LLama2). If you use the "galileo-cli" convenience deployment task, you can select a range of these predefined models (including which to use by default) to be included in a Galileo deployment. Once deployed, you can use the [prompt development settings UI](../chat-dev-settings/index.md) to change which predefined model is active for a chat session.

??? abstract "Current list of predefined models"
    --8<-- "development/models/predefined-models.md"

## Testing In-development Models

To experiment with an LLM not included in list of predefined models, you can configure Galileo to use a SageMaker endpoint within or across accounts. A simple approach is to deploy a new JumpStart model, create a Notebook that interacts with it, define a SageMaker endpoint for that Notebook, then configure a Galileo deployment to use it. This allows for rapid experimentation with new models, and provides a flexible development cycle for engineers, through the ability easily modify the code in the Notebook connected to the model. Examples of how to get started with JumpStart foundation models in SageMaker Notebooks can be found [here](https://github.com/aws/amazon-sagemaker-examples/tree/main/introduction_to_amazon_algorithms/jumpstart-foundation-models). Once you have deployed a SageMaker Endpoint backed by a Notebook, you can configure a Galileo deployment to use it via the [Prompt Development Inference settings](../chat-dev-settings/inference/).

## Integrating a New Model into Galileo

To codify a new model so it can be included in the Galileo deployment process and the model is an existing model, you can use the "ExistingLLM" construct to capture the successful configuration derived from the testing approach described above. The code snippet take from ```packages/galileo-cdk/src/ai/predefined/models.ts``` gives an example of this:

```typescript
    // NB: Here is example reference of how to integrate with existing model
    new ExistingLLM(this, "MyExistingLLM", {
      modelId: "example",
      uuid: "existing.model",
      name: "Existing Model",
      framework: {
        type: ModelFramework.SAGEMAKER_ENDPOINT,
        endpointName: "endpointName",
        endpointRegion: "endpointRegion",
        endpointKwargs: {},
        modelKwargs: {},
      },
      constraints: {
        maxTotalTokens: 2048,
        maxInputLength: 2047,
      },
      adapter: {},
    });
```

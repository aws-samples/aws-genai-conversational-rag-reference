# Bulk test questions against your deployed system

## Why?

If users (prompt engineers, developers) want to test their prompts with a long list of questions (50-100+), without automation, it would take too long, especially if one wants to test multiple versions of prompts, with various model kwargs (i.e.: `temperature`) or search kwargs (filters).

With this feature, users can feed in their chat configuration and questions, and run an automated test.

## Preparation

### Chat settings

Once you're done with your prompt setup, you can export it via the UI, or create your own.

1. Use the [Actions menu](../../chat-dev-settings/#actions-menu) feature on the UI
2. **Copy** your settings and save is as a `JSON` file on your developer machine

### Questions

The CLI expects an **array of strings** saved in a `JSON file`:

```json
// test-questions.json
[
 "Question 1",
 "Question 2",
 ...
 "Question N"
]
```

### Additional parameters

You'll need to provide the following cloud resources for the CLI:

1. Userpool used to manage users (retrieves automatically the list, you just need to choose)
2. The Lambda Url Endpoint to trigger (`AWS Console > CloudFormation > Stacks > Galileo-InferenceEngine* > Outputs > InferenceEngineLambdaUrl`)
3. Create a chat on the UI manually, and use the newly created chat's ID
<!-- 2. The API endpoint (root) of your deployed REST API (`AWS Console > CloudFormation > Stacks > Galileo-PresentationNestedStack > Outputs > ApiEndpoint`) -->

## Running the test

To run the automated test, use the following command:

```sh
pnpm run galileo-cli invoke chat-bulk
```

> Note: The test will directly invoke the chat endpoint in the deployed solution, so first you will need to authenticate yourself with your user.

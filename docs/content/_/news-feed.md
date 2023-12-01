
???+ tip "Announcements"

    !!! tip "Classification Chain"

        We now support enabling a pre-processing step to the conversational chain, called "classify", which is very flexible and powerful way to provide additional functionality and control over your chain. The classify sends the user question as input to LLM and returns JSON data which is parsed and provided to the following prompts. This can be used to detect original language, to perform translation, to categorize the question based on your own categorize, etc. This is very powerful when joined with the handlebar templates which can dynamically modify your prompts based on the output from classify step. Think prompt template selector but in a single handlebars template. [Read more](/aws-genai-conversational-rag-reference/development/chat-dev-settings/prompting/classify/)

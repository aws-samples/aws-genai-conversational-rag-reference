
???+ tip "Announcements"

    !!! tip "Classification Chain"

        We now support enabling a pre-processing step to the conversational chain, called "classify", which is very flexible and powerful way to provide additional functionality and control over your chain. The classify sends the user question as input to LLM and returns JSON data which is parsed and provided to the following prompts. This can be used to detect original language, to perform translation, to categorize the question based on your own categorize, etc. This is very powerful when joined with the handlebar templates which can dynamically modify your prompts based on the output from classify step. Think prompt template selector but in a single handlebars template. [Read more](/aws-genai-conversational-rag-reference/development/chat-dev-settings/prompting/classify/)

    !!! tip "Multiple embedding models support"

        We now support multiple embedding models! This enhancement allows you to configure multiple embedding models in a single deployment, providing greater flexibility and customization options. With this new feature, you can now: Set up multiple embedding models, each backed by a separate table in the Aurora PostgreSQL database. Specify the desired embedding model during document upload, indexing, and corpus API calls. Select the preferred embedding model for semantic search in the web UI's chat settings. Explore your embedding models using the updated developer tools. [Read more] (/aws-genai-conversational-rag-reference/development/vector-store/)

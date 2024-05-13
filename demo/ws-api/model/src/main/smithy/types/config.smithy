$version: "2"

namespace com.amazon

// Prompt runtime config for chat engine
structure ChatEnginePromptRuntimeConfig {
	// the content of the template (in handlebars format)
	@required
	template: String

	templatePartials: StringMap
	partialPartials: StringAnyMap
	inputVariables: Strings
}

// LLM config for chat engine
structure ChatEngineLLMConfig {
    model: Any
    modelKwargs: Any
    endpointKwargs: Any
}

// Chain config for chat engine
structure ChatEngineChainConfig {
    enabled: Boolean
    llm: ChatEngineLLMConfig
    prompt: ChatEnginePromptRuntimeConfig
}

// Search config for chat engine
structure ChatEngineSearchConfig {
  // The URL of the remote retriever server
  url: String
  // Max number of documents to retrieve
  limit: Integer
  // Search filter to apply to retrieval query
  filter: Any
  // Score threshold for retrieved documents (NOT IMPLEMENTED)
  scoreThreshold: Integer
  // The key in the JSON body to put the query in
  inputKey: String
  // The key in the JSON response to get the response from
  responseKey: String
  // The key in the JSON response to get the page content from
  pageContentKey: String
  // The key in the JSON response to get the metadata from
  metadataKey: String
}

// Memory (History) config for chat engine
structure ChatEngineMemoryConfig {
  // Maximum number messages to use for conversational context
  limit: Integer
}

// Chat engine config
structure ChatEngineConfig {
    // Primary LLM to use for inference
    llm: ChatEngineLLMConfig
    qaChain: ChatEngineChainConfig
    condenseQuestionChain: ChatEngineChainConfig
    classifyChain: ChatEngineChainConfig
    search: ChatEngineSearchConfig
    memory: ChatEngineMemoryConfig
}

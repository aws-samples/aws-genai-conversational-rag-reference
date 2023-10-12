$version: "2"

namespace com.amazon

//
// Mixins
//
enum MessageType {
    HUMAN = "human"
    AI = "ai"
    SYSTEM = "system"
    CHAT = "chat"
}

enum ChatEngineConfigSearchType {
    SIMILARITY = "similarity"
    SIMILARITY_SCORE_THRESHOLD = "similarity_score_threshold"
    MMR = "mmr"
}

structure ChatEngineConfig {
    // Inference LLM model id.
    // The unique model identifier assigned in application stack foundation model inventory
    // or a JSON object model info definition.
    llm_model: Any
    // Model kwargs to pass to the LLM model
    llm_model_kwargs: Any
    // Endpoint kwargs to pass to LLM model
    llm_endpoint_kwargs: Any
    // Url of the semantic search endpoint
    search_url: String
    // Search kwargs for performing RAG
    search_kwargs: Any
    // Memory kwargs for managing chat history
    memory_kwargs: Any
    // Type of search
    search_type: ChatEngineConfigSearchType
    // Prompt template used for final question/answser request to LLM
    qa_prompt: Any
    // Prompt template used for condensing and reformatting question/history prior to invoking question/answer request
    condense_question_prompt: Any
}

/// Chat search options
structure ChatSearchOptions {
    // The number of sources to consider (k).
    limit: Integer
    // Key-value parameter to pass for filtering metadata (e.g.: domain, collection, etc.).
    filters: StringAnyMap
}

structure ChatOptions {
    // Agent domain.
    domain: String
    // Search options for vectorstore.
    search: ChatSearchOptions
}

@mixin
structure ChatMessageIdMixin with [ChatIdMixin] {
    @required
    messageId: String
}

@mixin
structure ChatMessageDetailsMixin {
    // User ID of the creator of the chat session
    @required
    text: String
    // Creation datetime
    @required
    createdAt: EpochTimestamp
    // message type
    @required
    type: MessageType
}

//
// Structures
//
structure ChatMessage with [ChatMessageIdMixin, ChatMessageDetailsMixin] {}

list ChatMessages {
    member: ChatMessage
}

//
// operations
//
@input
structure ListChatMessagesInput for ChatMessageResource with [PaginatedInputMixin] {
    // Id of the chat to list messages for.
    @required
    @httpLabel
    chatId: String
    // Indicates if messages are queried in ascending order. Useful for infinite scrolling.
    @httpQuery("ascending")
    asc: Boolean
    // Indicates if resulting page of messages should be returned in reverse order.
    // This does not change the query result order, only the order of items in the current
    // page. Useful for infinite scroll in combination with `ascending=true`
    @httpQuery("reverse")
    reverse: Boolean
}

structure ListChatMessagesOutput for ChatMessageResource with [PaginatedOutputMixin] {
    chatMessages: ChatMessages
}

@readonly
@http(method: "GET", uri: "/chat/{chatId}")
@paginated(inputToken: "nextToken", outputToken: "nextToken", pageSize: "pageSize", items: "chatMessages")
operation ListChatMessages {
    input: ListChatMessagesInput
    output: ListChatMessagesOutput
    errors: [ServerError, ClientError]
}

@input
structure CreateChatMessageInput for CreateChatMessage {
    // Title of the chat session
    @required
    @httpLabel
    chatId: String
    @required
    question: String
    // Config for chat available only to authorized admin-like groups
    // Will be ignored for other users
    config: ChatEngineConfig

    // Define chat options such as domain, and search options for filtering
    // available for all users
    options: ChatOptions
}

structure CreateChatMessageOutput for CreateChatMessage {
    @required
    question: ChatMessage
    @required
    answer: ChatMessage
    // List of sources of the message - relevant for AI based messages only
    sources: ChatMessageSources
    // Arbitrary data related to the message
    traceData: Any
}

@idempotent
@http(method: "PUT", uri: "/chat/{chatId}/message")
operation CreateChatMessage {
    input: CreateChatMessageInput
    output: CreateChatMessageOutput
    errors: [ServerError, ClientError]
}

@input
structure DeleteChatMessageInput for DeleteChatMessage {
    // Title of the chat session
    @required
    @httpLabel
    chatId: String
    @required
    @httpLabel
    messageId: String
}

structure DeleteChatMessageOutput for DeleteChatMessage {
    @required
    chatId: String
    @required
    messageId: String
}

@idempotent
@http(method: "DELETE", uri: "/chat/{chatId}/message/{messageId}")
operation DeleteChatMessage {
    input: DeleteChatMessageInput
    output: DeleteChatMessageOutput
    errors: [ServerError, ClientError]
}

//
// Resources
//
resource ChatMessageResource {
    identifiers: {
        chatId: String
        messageId: String
    }
    list: ListChatMessages
    create: CreateChatMessage
    delete: DeleteChatMessage
}

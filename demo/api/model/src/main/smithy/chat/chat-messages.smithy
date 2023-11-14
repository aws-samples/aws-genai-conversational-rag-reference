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

    // Options to customize/configure chat engine
    options: ChatEngineConfig
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

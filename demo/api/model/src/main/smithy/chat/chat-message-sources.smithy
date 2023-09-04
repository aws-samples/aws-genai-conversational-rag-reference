$version: "2"

namespace com.amazon

structure ChatMessageSource {
    @required
    sourceId: String
    @required
    pageContent: String
    @required
    metadata: Any
    @required
    chatId: String
    @required
    messageId: String
}

list ChatMessageSources {
    member: ChatMessageSource
}

// 
// operations
// 
@input
structure ListChatMessageSourcesInput for ChatMessageSourceResource with [PaginatedInputMixin] {
    @required
    @httpLabel
    chatId: String
    @required
    @httpLabel
    messageId: String
}

structure ListChatMessageSourcesOutput for ChatMessageSourceResource with [PaginatedOutputMixin] {
    chatMessageSources: ChatMessageSources
}

@readonly
@http(method: "GET", uri: "/chat/{chatId}/message/{messageId}/source")
@paginated(inputToken: "nextToken", outputToken: "nextToken", pageSize: "pageSize", items: "chatMessageSources")
operation ListChatMessageSources {
    input: ListChatMessageSourcesInput
    output: ListChatMessageSourcesOutput
    errors: [ServerError, ClientError]
}

// 
// Resources
// 
resource ChatMessageSourceResource {
    identifiers: {
        chatId: String
        messageId: String
        sourceId: String
    }
    list: ListChatMessageSources
}

$version: "2"
namespace com.amazon


@async(direction: "client_to_server")
// @handler(language: "typescript")
operation SendChatMessage {
    input := {
        @required
        chatId: String

        @required
        tmpMessageId: String

        @required
        question: String

        // Options to customize/configure chat engine
        options: ChatEngineConfig
    }
}

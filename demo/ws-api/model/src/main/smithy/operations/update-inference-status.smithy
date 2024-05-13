
$version: "2"
namespace com.amazon

enum InferenceOperation {
    CHAT_MESSAGE_CREATE = "chat-message-create"
    DATA_SEARCH = "data-search"
    STEP_CLASSIFY = "step-classify"
    STEP_CONDENSE = "step-condense"
    STEP_QA = "step-qa"
    TRACE_DATA = "trace-data"
    SOURCES = "sources"
}

@async(direction: "server_to_client")
operation UpdateInferenceStatus {
    input := with [ChatIdMixin] {
        @required
        operation: String

        @required
        updatedAt: EpochTimestamp

        // optional status
        status: String

        // optional payload
        payload: Any
    }
}


$version: "2"
namespace com.amazon


@async(direction: "server_to_client")
operation StreamLLMResponse {
    input := with [ChatIdMixin] {
        @required
        chunks: Strings
    }
}

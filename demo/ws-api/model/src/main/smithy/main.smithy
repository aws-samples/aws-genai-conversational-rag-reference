$version: "2"
namespace com.amazon

/// Galileo Websocket api
@websocketJson
@connectHandler(language: "typescript")
@disconnectHandler(language: "typescript")
service WsApi {
    version: "1.0"
    operations: [
      SendChatMessage
      StreamLLMResponse
      UpdateInferenceStatus
    ]
}


// 1. "client->server" trigger inference engine "sendChatMessage" --> lambda handler (stream stuff back)

// data types sent back from server to client
// 2. "server->client" sendInferenceUpdate --> { operation, status } e.g.: { dataRetrieval: "success" }
// 3. "server->client" streamLLMResponse --> { messageChunks: string[] }
// 4. "server->client" sendTraceData --> { see L107 }


// interceptors: check types for callingIdentity
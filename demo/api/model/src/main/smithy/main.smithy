$version: "2"

namespace com.amazon

use aws.protocols#restJson1
/// A sample smithy api

@restJson1
service MyApi  with [
    ChatService
    CorpusService
    LLMService
]{
    version: "1.0"
    operations: []
    errors: [
        ServerError
        NotAuthorizedError
        ClientError
        ServerTemporaryError
        NotFoundError
    ]
}

string CognitoAuthenticationProvider

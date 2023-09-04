$version: "2"

namespace com.amazon

use aws.protocols#restJson1

@mixin
@restJson1
service LLMService {
    version: "1.0"
    operations: [
      LLMInventory
    ]
}


@readonly
@http(method: "GET", uri: "/llm/inventory")
operation LLMInventory {
    input:= {}
    output:= {
      @required
      inventory: Any
      // TODO: using any for now but should update schema based on actual inventory spec
    }
    errors: [ServerError, ClientError]
}

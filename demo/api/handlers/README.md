## Handlers

This directory contains lambda handlers for implementing your API.

Whenever an operation is annotated with the `@handler` trait in Smithy (or the `x-handler` vendor extension in OpenAPI), a stub handler implementation will be generated for you, which you are free to modify.
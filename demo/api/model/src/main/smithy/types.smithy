$version: "2"

namespace com.amazon

/// Timestamp as milliseconds from epoch
long EpochTimestamp

/// Error message
string ErrorMessage

/// A type for any object
document Any

/// List type for a list of anything
list Anys {
    member: Any
}

list Strings {
    member: String
}

/// An internal failure at the fault of the server
@error("server")
@httpError(500)
structure ServerError {
    /// Message with details about the error
    @required
    errorMessage: ErrorMessage
}

/// A temporary failure at the fault of the server
@error("server")
@httpError(503)
structure ServerTemporaryError {
    /// Message with details about the error
    @required
    errorMessage: ErrorMessage
}

/// An error at the fault of the client sending invalid input
@error("client")
@httpError(400)
structure ClientError {
    /// Message with details about the error
    @required
    errorMessage: ErrorMessage
}

/// An error due to the client attempting to access a missing resource
@error("client")
@httpError(404)
structure NotFoundError {
    /// Message with details about the error
    @required
    errorMessage: ErrorMessage
}

/// An error due to the client not being authorized to access the resource
@error("client")
@httpError(403)
structure NotAuthorizedError {
    /// Message with details about the error
    @required
    errorMessage: ErrorMessage
}

/// Extends inputs for "list" type operations to accept pagination details
@mixin
structure PaginatedInputMixin {
    /// A token for an additional page of results
    @httpQuery("nextToken")
    nextToken: String
    /// The number of results to return in a page
    @httpQuery("pageSize")
    pageSize: Integer
}

/// Extends outputs for "list" type operations to return pagination details
@mixin
structure PaginatedOutputMixin {
    /// Pass this in the next request for another page of results
    nextToken: String
}

/// Types of authenticated caller
enum CallingIdentityType {
    /// A cognito caller, from the UI
    COGNITO = "COGNITO"
    /// A sigv4 caller, from a machine to machine call
    SIGV4 = "SIGV4"
    /// An unregistered, external user
    EXTERNAL = "EXTERNAL"
}

/// Identifier for a user in the system
string IdentityId

/// Represents an authenticated user calling the API
structure CallingIdentity {
    /// The ID of the caller - for type COGNITO this is the subjectId, otherwise it's the iam user arn
    @required
    identityId: IdentityId
    /// The username of the caller
    @required
    username: String
    /// The email of the caller
    @required
    email: String
    /// The type of caller
    @required
    identityType: CallingIdentityType
}

list CallingIdentities {
    member: CallingIdentity
}

/// Extends structures with details about who created or updated the resource at what time
@mixin
structure AuditDetailsMixin {
    /// The user who created the resource
    @required
    createdBy: CallingIdentity
    /// The user who most recently updated the resource
    @required
    updatedBy: CallingIdentity
    /// The time at which the resource was created
    @required
    createdAt: EpochTimestamp
    /// The time of the most recent update
    @required
    updatedAt: EpochTimestamp
}

/// A generic tag which can be added to other structures
structure Tag {
    /// Tag key
    @required
    key: String
    /// Optional value of the tag
    value: String
}

list Tags {
    member: Tag
}

/// A generic structure for maps that are indexed by a string and hold Any value
map StringAnyMap {
    key: String
    value: Any
}

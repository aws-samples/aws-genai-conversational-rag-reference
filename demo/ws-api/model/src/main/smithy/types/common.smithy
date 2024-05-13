$version: "2"

namespace com.amazon

/// A type for any object
document Any

/// Timestamp as milliseconds from epoch
long EpochTimestamp

// List of strings
list Strings {
    member: String
}

/// A generic structure for maps that are indexed by a string and hold String value
map StringMap {
    key: String
    value: String
}

/// A generic structure for maps that are indexed by a string and hold Any value
map StringAnyMap {
    key: String
    value: Any
}
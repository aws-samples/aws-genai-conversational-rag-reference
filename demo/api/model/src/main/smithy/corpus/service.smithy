$version: "2"

namespace com.amazon

use aws.protocols#restJson1

@mixin
@restJson1
service CorpusService {
    version: "1.0"
    operations: [
      SimilaritySearch
      EmbedDocuments
      EmbedQuery
    ]
}

structure Document {
    // Document text content
    @required
    pageContent: String
    // Document metadata
    @required
    metadata: Any
    // Similarity score for search with score
    score: Float
}

list Documents {
  member: Document
}

list Texts {
  member: String
}

list Vector {
  member: Float
}

list Vectors {
  member: Vector
}

@readonly
@http(method: "POST", uri: "/corpus/search/similarity")
operation SimilaritySearch {
    input:= {
      @httpQuery("withScore")
      withScore: Boolean

      @required
      query: String
      k: Integer
      filter: Any
    }
    output:= {
      @required
      documents: Documents
    }
    errors: [ServerError, ClientError]
}

@readonly
@http(method: "POST", uri: "/corpus/embedding/embed-documents")
operation EmbedDocuments {
    input:= {
      @required
      texts: Texts
    }
    output:= {
      @required
      embeddings: Vectors
      @required
      model: String
    }
    errors: [ServerError, ClientError]
}

@readonly
@http(method: "POST", uri: "/corpus/embedding/embed-query")
operation EmbedQuery {
    input:= {
      @required
      text: String
    }
    output:= {
      @required
      embedding: Vector
      @required
      model: String
    }
    errors: [ServerError, ClientError]
}

// TODO: support indexing documents into the vector store (Admin Only)

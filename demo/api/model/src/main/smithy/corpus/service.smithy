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
      EmbeddingModelInventory
    ]
}

enum DistanceStrategy {
  EUCLIDEAN = "l2",
  COSINE = "cosine",
  MAX_INNER_PRODUCT = "inner",
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

structure EmbeddingModel {
    @required
    uuid: String

    @required
    modelId: String

    @required
    dimensions: Integer

    @required
    default: Boolean

    modelRefKey: String
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

list EmbeddingModels {
  member: EmbeddingModel
}

@readonly
@http(method: "POST", uri: "/corpus/search/similarity")
operation SimilaritySearch {
    input:= {
      @httpQuery("withScore")
      withScore: Boolean

      @required
      query: String
      // Number of search results to return
      k: Integer
      // JSON object with metadata filter to apply to search
      filter: Any
      // Distance strategy to use for similar search
      distanceStrategy: DistanceStrategy
      // Embedding model reference key
      modelRefKey: String
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
      // Embedding model reference key
      modelRefKey: String
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
      // Embedding model reference key
      modelRefKey: String
    }
    output:= {
      @required
      embedding: Vector
      @required
      model: String
    }
    errors: [ServerError, ClientError]
}

@readonly
@http(method: "GET", uri: "/corpus/embedding/model-inventory")
operation EmbeddingModelInventory {
    input:= {}
    output:= {
      @required
      models: EmbeddingModels
    }
    errors: [ServerError, ClientError]
}

// TODO: support indexing documents into the vector store (Admin Only)

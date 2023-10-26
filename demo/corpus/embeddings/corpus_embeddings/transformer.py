# ! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from typing import List, TypedDict, Optional
from functools import lru_cache
from sentence_transformers import SentenceTransformer
from .env import SENTENCE_TRANSFORMER_MODEL, VECTOR_SIZE

Vector = List[float]

class EmbedDocumentsResult(TypedDict):
  embeddings: List[Vector]
  model: str

@lru_cache
def get_model(model_name: str = SENTENCE_TRANSFORMER_MODEL) -> SentenceTransformer:
    print(f"get_model: {model_name}")
    return SentenceTransformer(model_name)

AUTO_MULTI_THRESHOLD=10*1000

def sum_texts_len(texts: List[str]) -> int:
  return sum(list(map(len, texts)))

def embed_documents(texts: str | List[str], multiprocess: Optional[bool] = None) -> EmbedDocumentsResult:
  model = get_model()

  if isinstance(texts, list):
    if multiprocess == None:
      # Infer multiprocess based on total sum of texts length
      texts_len = sum_texts_len(texts)
      multiprocess = texts_len >= AUTO_MULTI_THRESHOLD
  else:
    # Never use multiprocess for single text input
    multiprocess = False


  if multiprocess == True:
    pool = model.start_multi_process_pool()

    embeddings = model.encode_multi_process(list(texts), pool).tolist()

    model.stop_multi_process_pool(pool)
  else:
    embeddings = model.encode(texts).tolist()

  model_name = SENTENCE_TRANSFORMER_MODEL.split("/")[-1]

  return EmbedDocumentsResult(
    embeddings=embeddings,
    model=f"{model_name}({VECTOR_SIZE})",
  )

# ! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os

EMBEDDING_PORT:int = int(os.getenv("EMBEDDING_PORT", "1337"))

SENTENCE_TRANSFORMER_MODEL:str = os.getenv("EMBEDDING_SENTENCE_TRANSFORMER_MODEL", "all-mpnet-base-v2")

VECTOR_SIZE:int = int(os.getenv("VECTOR_SIZE", "768"))

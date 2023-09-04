# ! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import sys
from sentence_transformers import SentenceTransformer

from .env import SENTENCE_TRANSFORMER_MODEL

def save_model(model_name: str, path: str):
    """Loads any model from Hugginface model hub and saves it to disk."""
    model = SentenceTransformer(model_name)
    model.save(path)

if __name__ == "__main__":
    args = dict(enumerate(sys.argv))
    model_name = args.get(1)
    save_model(model_name, args.get(2))

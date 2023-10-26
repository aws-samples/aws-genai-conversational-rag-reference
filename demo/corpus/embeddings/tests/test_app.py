# ! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
TEST_DIR=os.path.dirname(os.path.abspath(__file__))
os.environ["SENTENCE_TRANSFORMERS_HOME"] = os.path.join(TEST_DIR, ".cache")

import unittest
import threading
import requests
import json
from corpus_embeddings.app import serve
from corpus_embeddings.transformer import EmbedDocumentsResult, SENTENCE_TRANSFORMER_MODEL, VECTOR_SIZE


class TestTransformerApp(unittest.TestCase):
  def setUp(self) -> None:
    self.server = serve(False)
    self.base_url = f"http://localhost:{self.server.server_port}"
    self.server_thread = threading.Thread(target=self.server.serve_forever)
    self.server_thread.daemon = True
    self.server_thread.start()

  def tearDown(self) -> None:
    self.server.shutdown()
    self.server_thread.join()

  def test_embed_documents(self):
    url = f"{self.base_url}/embed-documents"
    data = json.dumps({
      "texts": ["example 1", "example 2"]
    })
    headers = {"Content-Type": "application/json"}
    response = requests.post(url, data=data, headers=headers, timeout=300)
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.headers["Content-Type"], "application/json")
    response_data: EmbedDocumentsResult = json.loads(response.content)
    self.assertEqual(response_data["model"], f"{SENTENCE_TRANSFORMER_MODEL}({VECTOR_SIZE})")
    self.assertEqual(len(response_data["embeddings"]), 2)

if __name__ == '__main__':
    unittest.main()

# ! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import logging
logging.basicConfig(level=logging.DEBUG)

print(globals())

if __name__ == '__main__':
  import sys
  import os
  sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

  import multiprocessing
  from corpus_embeddings.app import serve

  multiprocessing.set_start_method('spawn', force=True)

  # Start the server
  serve()

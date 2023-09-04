# ! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import json
from timeit import default_timer as timer
from datetime import timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from typing import Dict, List, TypedDict, Optional, Type
from .env import EMBEDDING_PORT
from .transformer import embed_documents, get_model

class EncodingRequest(TypedDict):
  texts: List[str]
  multiprocessing: Optional[bool]

class SimpleRouter:
  def __init__(self):
    self.routes: Dict[str, Type[BaseHTTPRequestHandler]] = {}

  def add_route(self, path: str, handler: Type[BaseHTTPRequestHandler]):
    self.routes[path] = handler

  def get_handler(self, path: str) -> Type[BaseHTTPRequestHandler]:
    return self.routes[path]

class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):
  def do_GET(self):
    self.send_response(405) # Method Not Allowed
    self.send_header("Content-Type", "text/plain")
    self.end_headers()
    self.wfile.write("Method not allowed".encode())

  def do_POST(self):
    content_length = int(self.headers["Content-Length"])
    post_data = self.rfile.read(content_length).decode("utf-8")

    parsed_url = urlparse(self.path)
    path: str = parsed_url.path
    # query_params: Dict[str, List[str]] = parse_qs(parsed_url.query)

    try:
      if path == "/embed-documents":
        data: EncodingRequest = json.loads(post_data)

        result = embed_documents(data["texts"], multiprocess=bool(data.get("multiprocessing", False)))

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())

      else:
        self.send_response(404)
        self.send_header("Content-Type", "plain/text")
        self.end_headers()
        self.wfile.write("Not found".encode())
    except Exception as ex:
      print(ex)
      self.send_response(400)
      self.send_header("Content-Type", "plain/text")
      self.end_headers()
      self.wfile.write(str(ex).encode())

def serve(start: bool = True) -> HTTPServer:
  host: str = "localhost"
  port: int = EMBEDDING_PORT

  print(f"Starting embedding server on http://{host}:{port}")
  start_time = timer()

  # cache model
  get_model()

  router = SimpleRouter()
  router.add_route("/embed-documents", SimpleHTTPRequestHandler)

  server = HTTPServer((host, port), SimpleHTTPRequestHandler)
  print(f"Transformer server started on http://{host}:{port}")

  if start:
    server.serve_forever()

  duration = timedelta(seconds=timer()-start_time)
  print(f"Took {duration.total_seconds()} seconds to start server")

  return server

if __name__ == '__main__':
    serve()

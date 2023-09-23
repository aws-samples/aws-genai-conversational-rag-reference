#!/bin/bash

set -e

SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
DOCS_DIR="$(dirname "$SCRIPT_DIR")"
cd $DOCS_DIR

rm -rf dist
poetry update
poetry run mkdocs build -d $DOCS_DIR/dist/docs

#!/bin/bash

set -e

SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
DOCS_DIR="$(dirname "$SCRIPT_DIR")"
cd $DOCS_DIR

poetry update
poetry add $(mkdocs get-deps)

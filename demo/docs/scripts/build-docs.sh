#!/bin/bash

set -e

rm -rf build dist
mkdir -p build/docs
cp mkdocs.yml build/docs
cp -r content build/docs

cd build/docs
if [ ! -d .venv ]; then
  python3 -m venv --system-site-packages .venv
fi
source .venv/bin/activate
python3 -m pip install -r ../../requirements-dev.txt --upgrade
python3 -m mkdocs build -d ../../dist/docs
deactivate
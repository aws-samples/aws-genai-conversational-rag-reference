#!/bin/bash
# ! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

TARGET="$1"
shift

# Start embedding server
time (
if [ -z "$(netcat -z localhost 1337)" ]; then
  echo "Starting embedding server"
  nohup python -um corpus_embeddings &
  echo "Waiting for the Python server to start..."
  while ! netcat -z localhost 1337; do
    sleep 0.1
  done
  echo "Embedding server started"
else
  echo "Embedding server already started - http://localhost:1337"
fi
)

if [ "${TARGET}" == "lambda" ]; then
  echo "Run lambda entry script"
  exec /lambda_entry_script.sh $@
elif [ "${TARGET}" == "sagemaker" ]; then
  echo "Run sagemaker entry script"
  exec /sagemaker_entry_script.sh $@
else
  echo "entrypoint requires the corpus command to be the first argument" 1>&2
  exit 444
fi

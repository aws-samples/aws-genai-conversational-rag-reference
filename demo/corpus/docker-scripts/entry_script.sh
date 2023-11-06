#!/bin/bash
# ! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


echo "Entry Script: $@"

TARGET="$1"
shift

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

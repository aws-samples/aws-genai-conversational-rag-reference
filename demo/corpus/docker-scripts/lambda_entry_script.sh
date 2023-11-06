#!/bin/bash
# ! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

cd ${FUNCTION_DIR}/logic

_HANDLER="${1:-api.handler}"
shift

if [ -z "${AWS_LAMBDA_RUNTIME_API}" ]; then
  exec /usr/local/bin/aws-lambda-rie $(which npx) --no-install aws-lambda-ric ${_HANDLER}
else
  exec $(which npx) --no-install aws-lambda-ric ${_HANDLER}
fi

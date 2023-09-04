#!/bin/bash
# ! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

cd ${FUNCTION_DIR}/logic

_HANDLER="${1:-indexing.js}"
shift

AWS_LAMBDA_FUNCTION_MEMORY_SIZE=${AWS_LAMBDA_FUNCTION_MEMORY_SIZE:-1024}

if [ -n "$AWS_LAMBDA_FUNCTION_MEMORY_SIZE" ]; then
  new_space=$(expr $AWS_LAMBDA_FUNCTION_MEMORY_SIZE / 10)
  semi_space=$(expr $new_space / 2)
  old_space=$(expr $AWS_LAMBDA_FUNCTION_MEMORY_SIZE - $new_space)
  MEMORY_ARGS=(
    "--max-semi-space-size=$semi_space"
    "--max-old-space-size=$old_space"
  )
fi

NODE_ARGS=(
    --expose-gc
    --max-http-header-size 81920
    --enable-source-maps
    "${MEMORY_ARGS[@]}"
    ${_HANDLER}
    )

# Run indexing
exec /usr/bin/node "${NODE_ARGS[@]}"

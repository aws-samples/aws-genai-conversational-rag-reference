#!/bin/bash

if [[ -z "${HF_MODEL_ID}" ]]; then
  echo "HF_MODEL_ID must be set"
  exit 1
fi
export MODEL_ID="${HF_MODEL_ID}"

if [[ -n "${HF_MODEL_REVISION}" ]]; then
  export REVISION="${HF_MODEL_REVISION}"
fi

if [[ -n "${SM_NUM_GPUS}" ]]; then
  export NUM_SHARD="${SM_NUM_GPUS}"
fi

if [[ -n "${HF_MODEL_QUANTIZE}" ]]; then
  export QUANTIZE="${HF_MODEL_QUANTIZE}"
fi

if [[ -n "${HF_MODEL_TRUST_REMOTE_CODE}" ]]; then
  export TRUST_REMOTE_CODE="${HF_MODEL_TRUST_REMOTE_CODE}"
fi

if [[ -n "${GPTQ_BITS}" ]]; then
  export GPTQ_BITS="${GPTQ_BITS}"
fi

if [[ -n "${GPTQ_GROUPSIZE}" ]]; then
  export GPTQ_GROUPSIZE="${GPTQ_GROUPSIZE}"
fi

if [[ -n "${DNTK_ALPHA_SCALER}" ]]; then
  export DNTK_ALPHA_SCALER="${DNTK_ALPHA_SCALER}"
fi

if [[ -n "${MAX_BATCH_PREFILL_TOKENS}" ]]; then
  export MAX_BATCH_PREFILL_TOKENS="${MAX_BATCH_PREFILL_TOKENS}"
fi

if [[ -n "${MAX_BATCH_TOTAL_TOKENS}" ]]; then
  export MAX_BATCH_TOTAL_TOKENS="${MAX_BATCH_TOTAL_TOKENS}"
fi
text-generation-launcher --port 8080

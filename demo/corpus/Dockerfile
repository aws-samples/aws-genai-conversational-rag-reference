# ! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
ARG FUNCTION_DIR="/function"
ARG PYTHON_TARGET="/function/venv"
ARG EMBEDDINGS_DIR="${FUNCTION_DIR}/embeddings"
ARG LOGIC_DIR="${FUNCTION_DIR}/logic"

# Model name for embeddings (must be sentence-transformer model)
ARG MODEL_NAME="all-mpnet-base-v2"
ARG EMBEDDING_SENTENCE_TRANSFORMER_MODEL="${EMBEDDINGS_DIR}/${MODEL_NAME}"

#################################################################################################################
#################################################################################################################
## BUILD IMAGE
#################################################################################################################
#################################################################################################################
FROM python:3.11 as build-image

# Common Setup
ARG FUNCTION_DIR
ARG PYTHON_TARGET
ARG EMBEDDINGS_DIR
ARG LOGIC_DIR
RUN mkdir -p ${FUNCTION_DIR}
ENV PYTHONPATH="${PYTHONPATH}:${PYTHON_TARGET}"
ARG ENV MODEL_NAME
ENV MODEL_NAME=$MODEL_NAME
ARG ENV EMBEDDING_SENTENCE_TRANSFORMER_MODEL
ENV EMBEDDING_SENTENCE_TRANSFORMER_MODEL=$EMBEDDING_SENTENCE_TRANSFORMER_MODEL

# Install build dependencies
RUN apt-get update && \
    apt-get install -y \
    g++ \
    make \
    cmake \
    unzip \
    libcurl4-openssl-dev \
    tree
# Upgrade pip
RUN pip install --upgrade pip

# NodeJS Setup
ADD ./docker-scripts/install-nodejs.sh /install-nodejs.sh
RUN /install-nodejs.sh

# Install Lambda Runtime Interface Client
RUN cd ${FUNCTION_DIR} && npm init -y && npm install -dd aws-lambda-ric
# AWS LAMBDA RIE
ARG TARGETPLATFORM
ARG BUILDPLATFORM
RUN echo "I am running on $BUILDPLATFORM, building for $TARGETPLATFORM"
RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then curl -Lo aws-lambda-rie https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie-arm64; fi
RUN if [ "$TARGETPLATFORM" = "linux/amd64" ]; then curl -Lo aws-lambda-rie https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie; fi
RUN if [ -e "aws-lambda-rie" ]; then chmod +x aws-lambda-rie; mv aws-lambda-rie /usr/local/bin/; fi

# Install python deps
WORKDIR ${EMBEDDINGS_DIR}
COPY ./embeddings/dist ${EMBEDDINGS_DIR}/
RUN pip install --target ${PYTHON_TARGET} ./corpus_embeddings-0.0.0-py3-none-any.whl
WORKDIR ${EMBEDDINGS_DIR}
RUN tree -L 2 .

# Download and store the sentence-transformer model locally for runtime
RUN python -m "corpus_embeddings.save_model" "${MODEL_NAME}" "${EMBEDDING_SENTENCE_TRANSFORMER_MODEL}"
RUN tree -L 2 ${EMBEDDING_SENTENCE_TRANSFORMER_MODEL}

# Copy NodeJs artifacts
ENV LOGIC_DIR="${FUNCTION_DIR}/logic"
RUN mkdir -p ${LOGIC_DIR}
WORKDIR ${LOGIC_DIR}
RUN npm init -y
COPY ./logic/.docker-dist/* .
RUN tree -L 2 .
# Verify logic package copied correclty
RUN node -e "typeof require('./api').similaritySearch === 'function';"

#################################################################################################################
#################################################################################################################
## RUNTIME IMAGE (slim)
#################################################################################################################
#################################################################################################################
FROM python:3.11-slim

# Common Setup
ARG FUNCTION_DIR
ARG PYTHON_TARGET
ARG EMBEDDINGS_DIR
ARG LOGIC_DIR
RUN mkdir -p ${FUNCTION_DIR}
ENV PYTHONPATH="${PYTHONPATH}:${PYTHON_TARGET}"
ARG ENV MODEL_NAME
ENV MODEL_NAME=$MODEL_NAME
ARG ENV EMBEDDING_SENTENCE_TRANSFORMER_MODEL
ENV EMBEDDING_SENTENCE_TRANSFORMER_MODEL=$EMBEDDING_SENTENCE_TRANSFORMER_MODEL

# Runtime libraries
RUN apt-get update && \
    apt-get install -y \
    curl \
    wget \
    gnupg2 \
    tree \
    dnsmasq \
    netcat-openbsd

# Download the AmazonRootCA1.pem certificate
RUN wget -O /usr/local/share/ca-certificates/AmazonRootCA1.crt https://www.amazontrust.com/repository/AmazonRootCA1.pem
# Update the CA certificates
RUN update-ca-certificates

# Runtime Env
ENV PGSSLROOTCERT='/usr/local/share/ca-certificates/AmazonRootCA1.crt'
ENV PGSSLMODE="verify-full"
# Required for Node runtimes which use npm@8.6.0+ because
# by default npm writes logs under /home/.npm and Lambda fs is read-only
ENV NPM_CONFIG_CACHE=/tmp/.npm

# NodeJS Setup
ADD ./docker-scripts/install-nodejs.sh /install-nodejs.sh
RUN /install-nodejs.sh

WORKDIR ${FUNCTION_DIR}

# Copy build artifacts
COPY --from=build-image /usr/local/bin/aws-lambda-rie /usr/local/bin/aws-lambda-rie
COPY --from=build-image ${FUNCTION_DIR} ${FUNCTION_DIR}
RUN tree -L 2 ${FUNCTION_DIR}

# Copy scripts
ADD ./docker-scripts/* /

# Clean up unneccessary runtime packages - should only need `netcat`
RUN apt-get purge -y \
    curl \
    wget \
    gnupg2 \
    tree
# Remove apt list to save space after all installs complete
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory to function root directory
WORKDIR ${FUNCTION_DIR}

ENV TRANSFORMERS_CACHE="/tmp/.cache"
ENV FUNCTION_DIR="/function"

ENTRYPOINT ["/entry_script.sh"]

CMD ["lambda", "api.handler"]

# ! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
ARG FUNCTION_DIR="/function"
ARG PYTHON_TARGET="/function/venv"
ARG LOGIC_DIR="${FUNCTION_DIR}/logic"

#################################################################################################################
#################################################################################################################
## BUILD IMAGE
#################################################################################################################
#################################################################################################################
FROM node:18 as build-image

# Buildtime libraries
RUN apt-get update && \
    apt-get install -y \
    apt-utils \
    curl \
    wget \
    cmake

# Common Setup
ARG FUNCTION_DIR
ARG LOGIC_DIR
RUN mkdir -p ${FUNCTION_DIR}

# Install Lambda Runtime Interface Client
RUN cd ${FUNCTION_DIR} && npm init -y && npm install -dd aws-lambda-ric
# AWS LAMBDA RIE
ARG TARGETPLATFORM
ARG BUILDPLATFORM
RUN echo "I am running on $BUILDPLATFORM, building for $TARGETPLATFORM"
RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then curl -Lo aws-lambda-rie https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie-arm64; fi
RUN if [ "$TARGETPLATFORM" = "linux/amd64" ]; then curl -Lo aws-lambda-rie https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie; fi
RUN if [ -e "aws-lambda-rie" ]; then chmod +x aws-lambda-rie; mv aws-lambda-rie /usr/local/bin/; fi

# Download the AmazonRootCA1.pem certificate
RUN wget -O /usr/local/share/ca-certificates/AmazonRootCA1.crt https://www.amazontrust.com/repository/AmazonRootCA1.pem

# Copy NodeJs artifacts
ENV LOGIC_DIR="${FUNCTION_DIR}/logic"
RUN mkdir -p ${LOGIC_DIR}
WORKDIR ${LOGIC_DIR}
RUN npm init -y
COPY ./logic/.docker-dist/* .
# Verify logic package copied correclty
RUN node -e "typeof require('./api').similaritySearch === 'function';"

#################################################################################################################
#################################################################################################################
## RUNTIME IMAGE (slim)
#################################################################################################################
#################################################################################################################
FROM node:18-slim

RUN apt-get update && \
    apt-get install -y \
    ca-certificates

# Common Setup
ARG FUNCTION_DIR
ARG LOGIC_DIR
RUN mkdir -p ${FUNCTION_DIR}

# Required for Node runtimes which use npm@8.6.0+ because
# by default npm writes logs under /home/.npm and Lambda fs is read-only
ENV NPM_CONFIG_CACHE=/tmp/.npm

WORKDIR ${FUNCTION_DIR}

# Lambda RIE
COPY --from=build-image /usr/local/bin/aws-lambda-rie /usr/local/bin/aws-lambda-rie
# CA certificates
COPY --from=build-image /usr/local/share/ca-certificates/AmazonRootCA1.crt /usr/local/share/ca-certificates/AmazonRootCA1.crt
RUN update-ca-certificates
ENV PGSSLROOTCERT='/usr/local/share/ca-certificates/AmazonRootCA1.crt'
ENV PGSSLMODE="verify-full"
# Function code
COPY --from=build-image ${FUNCTION_DIR} ${FUNCTION_DIR}

# Copy scripts
ADD ./docker-scripts/* /

# Set working directory to function root directory
WORKDIR ${FUNCTION_DIR}

ENV FUNCTION_DIR="/function"

RUN node --version
RUN npx --version

ENTRYPOINT ["/entry_script.sh"]

CMD ["lambda", "api.handler"]

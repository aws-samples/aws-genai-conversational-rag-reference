#!/bin/bash
# ! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

echo "Installing NodeJs"

apt-get install -y curl

# Add the Node.js repository to the sources list
echo "deb https://deb.nodesource.com/node_18.x buster main" > /etc/apt/sources.list.d/nodesource.list
# Download the Node.js repository signing key and add it to the trusted keyring
curl -sSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | gpg --dearmor > /etc/apt/trusted.gpg.d/nodesource.gpg

apt-get update
apt-get install -y nodejs
apt-mark hold nodejs

export NODE_EXEC=$(which node)
echo "NodeJs installed at ${NODE_EXEC}"
echo "NodeJs Version: $(node --version)"

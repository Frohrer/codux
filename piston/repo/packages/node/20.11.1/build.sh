#!/bin/bash

# Download Node.js
curl "https://nodejs.org/dist/v20.11.1/node-v20.11.1-linux-x64.tar.xz" -o node.tar.xz

# Extract preserving directory structure first
tar xf node.tar.xz

# Copy the pre-built npm script from Node's bin directory
cp node-v20.11.1-linux-x64/bin/npm bin/
cp node-v20.11.1-linux-x64/bin/npx bin/

# Now extract the rest with strip-components
rm -rf bin/node
tar xf node.tar.xz --strip-components=1

# Clean up
rm node.tar.xz
rm -rf node-v20.11.1-linux-x64

chmod +x bin/npm bin/npx
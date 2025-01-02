#!/bin/bash

SERVER=1
BUILD=1
CI=0

echo "Installing packages"
./install.sh

echo "Creating index"
chmod +x ./mkindex.sh
# ./mkindex.sh
echo "Index created"

if [[ $SERVER -eq 1 ]]; then
    echo "Starting index server.."
    # We want the child process to replace the shell to handle signals
    exec python3 /serve.py
else
    echo "Skipping starting index server"
fi
exit 0

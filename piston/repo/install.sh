#!/bin/bash
set -e

# Change to packages directory where Makefile is located
cd /app/packages

echo "Building requested packages..."
# Build specific packages using the Makefile in the packages directory
make -j$(nproc) node-20.11.1.pkg.tar.gz
make -j$(nproc) python-3.11.0.pkg.tar.gz
make -j$(nproc) python-3.11.11.pkg.tar.gz
make -j$(nproc) python-3.12.8.pkg.tar.gz
make -j$(nproc) python-3.13.1.pkg.tar.gz


# Return to app directory for index creation and serving
cd /app

echo "Creating index..."
./mkindex.sh

echo "Starting server..."
exec python3 serve.py
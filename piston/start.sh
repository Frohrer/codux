#!/bin/bash
set -e

# Build packages
./piston build-pkg node 20.11.1
./piston build-pkg python 3.11.0
./piston build-pkg streamlit 3.11.0
./piston build-pkg python 3.12.8
./piston build-pkg python 3.13.1
./piston build-pkg python 3.14.0
# ./piston build-pkg bash 5.2.0

# Start docker-compose
exec docker-compose up
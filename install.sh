#!/bin/bash
set -e
chmod +x ./piston/repo/piston
# Build packages
./piston/repo/piston build-pkg node 20.11.1
# ./piston/repo/piston build-pkg node 15.10.0
# ./piston/repo/piston build-pkg node 16.3.0
# ./piston/repo/piston build-pkg node 18.15.0
# ./piston/repo/piston build-pkg python 2.7.18
# ./piston/repo/piston build-pkg python 3.5.10
# ./piston/repo/piston build-pkg python 3.9.1
# ./piston/repo/piston build-pkg python 3.9.4
# ./piston/repo/piston build-pkg python 3.10.0
# ./piston/repo/piston build-pkg python 3.11.11
# ./piston/repo/piston build-pkg streamlit 3.11.0
# ./piston/repo/piston build-pkg python 3.12.8
# ./piston/repo/piston build-pkg python 3.13.1
# ./piston/repo/piston build-pkg bash 5.2.0
# ./piston/repo/piston build-pkg go 1.16.2
# ./piston/repo/piston build-pkg typescript 4.2.3
# ./piston/repo/piston build-pkg typescript 5.0.3
# ./piston/repo/piston build-pkg rust 1.50.0
# ./piston/repo/piston build-pkg rust 1.56.1
# ./piston/repo/piston build-pkg rust 1.62.0
# ./piston/repo/piston build-pkg rust 1.63.0
# ./piston/repo/piston build-pkg rust 1.65.0
# ./piston/repo/piston build-pkg rust 1.68.2



#!/bin/bash

# Download Node.js
curl "https://nodejs.org/dist/v20.11.1/node-v20.11.1-linux-x64.tar.xz" -o node.tar.xz

# Extract with strip-components=1 to flatten directory structure
tar xf node.tar.xz --strip-components=1

# Clean up the archive
rm node.tar.xz

# Create npmrc that forces npm to use local paths
cat > lib/node_modules/npm/npmrc << EOF
prefix=\${PWD}
cache=\${PWD}/cache
tmp=\${PWD}/tmp
init-module=\${PWD}/.npm-init.js
userconfig=\${PWD}/npmrc
EOF

# Create the npm wrapper that sets up the environment before invoking npm
cat > bin/npm << 'EOF'
#!/bin/bash
export npm_config_userconfig="$PWD/lib/node_modules/npm/npmrc"
export HOME="$PWD"
"$PWD/bin/node" "$PWD/lib/node_modules/npm/bin/npm-cli.js" "$@"
EOF

chmod +x bin/npm

# Create necessary directories that npm will try to use
mkdir -p cache tmp
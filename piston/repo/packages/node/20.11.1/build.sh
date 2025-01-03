#!/bin/bash

# Download Node.js
curl "https://nodejs.org/dist/v20.11.1/node-v20.11.1-linux-x64.tar.xz" -o node.tar.xz

# Extract with strip-components=1 to flatten directory structure
tar xf node.tar.xz --strip-components=1

# Clean up the archive
rm node.tar.xz

# Ensure npm and npx are executable
chmod +x lib/node_modules/npm/bin/npm-cli.js
chmod +x lib/node_modules/npm/bin/npx-cli.js

# Create directories npm needs
mkdir -p tmp
mkdir -p home/.npm

# Create npm and npx shell scripts in bin/ that set all necessary environment variables
cat > bin/npm << 'EOF'
#!/bin/bash
DIR="$(dirname "$(dirname "${BASH_SOURCE[0]}")")"
export HOME="$DIR/home"
export npm_config_userconfig="$DIR/home/.npmrc"
export npm_config_cache="$DIR/home/.npm"
export npm_config_tmp="$DIR/tmp"
export npm_config_prefix="$DIR"
export NODE_PATH="$DIR/lib/node_modules"
"$DIR/bin/node" "$DIR/lib/node_modules/npm/bin/npm-cli.js" "$@"
EOF

cat > bin/npx << 'EOF'
#!/bin/bash
DIR="$(dirname "$(dirname "${BASH_SOURCE[0]}")")"
export HOME="$DIR/home"
export npm_config_userconfig="$DIR/home/.npmrc"
export npm_config_cache="$DIR/home/.npm"
export npm_config_tmp="$DIR/tmp"
export npm_config_prefix="$DIR"
export NODE_PATH="$DIR/lib/node_modules"
"$DIR/bin/node" "$DIR/lib/node_modules/npm/bin/npx-cli.js" "$@"
EOF

# Make the shell scripts executable
chmod +x bin/npm bin/npx

# Create empty .npmrc to prevent npm from trying to create it
touch home/.npmrc
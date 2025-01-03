#!/bin/bash

# Download Node.js
curl "https://nodejs.org/dist/v16.3.0/node-v16.3.0-linux-x64.tar.xz" -o node.tar.xz

# Extract with strip-components=1 to flatten directory structure
tar xf node.tar.xz --strip-components=1

# Clean up the archive
rm node.tar.xz

# Ensure npm and npx are executable
chmod +x lib/node_modules/npm/bin/npm-cli.js
chmod +x lib/node_modules/npm/bin/npx-cli.js

# Create npm and npx shell scripts in bin/ that use the local node installation
cat > bin/npm << 'EOF'
#!/bin/bash
DIR="$(dirname "$(dirname "${BASH_SOURCE[0]}")")"
"$DIR/bin/node" "$DIR/lib/node_modules/npm/bin/npm-cli.js" "$@"
EOF

cat > bin/npx << 'EOF'
#!/bin/bash
DIR="$(dirname "$(dirname "${BASH_SOURCE[0]}")")"
"$DIR/bin/node" "$DIR/lib/node_modules/npm/bin/npx-cli.js" "$@"
EOF

# Make the shell scripts executable
chmod +x bin/npm bin/npx
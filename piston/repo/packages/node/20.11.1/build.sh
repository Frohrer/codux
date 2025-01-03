#!/bin/bash

# Download Node.js
curl "https://nodejs.org/dist/v20.11.1/node-v20.11.1-linux-x64.tar.xz" -o node.tar.xz

# Extract with strip-components=1 to flatten directory structure
tar xf node.tar.xz --strip-components=1

# Clean up the archive
rm node.tar.xz

# Create minimal npm script that just passes args to npm-cli.js
cat > bin/npm << 'EOF'
#!/bin/bash
DIR="$(dirname "$(dirname "$0")")"
"$DIR/bin/node" "$DIR/lib/node_modules/npm/bin/npm-cli.js" "$@"
EOF

chmod +x bin/npm
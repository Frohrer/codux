#!/bin/bash

# Download Node.js
curl "https://nodejs.org/dist/v20.11.1/node-v20.11.1-linux-x64.tar.xz" -o node.tar.xz

# Extract with strip-components=1 to flatten directory structure
tar xf node.tar.xz --strip-components=1

# Clean up the archive
rm node.tar.xz

# Create npm wrapper that forces a system root
cat > bin/npm << 'EOF'
#!/bin/bash
export SYSTEMROOT=/box/submission
node "$PWD/lib/node_modules/npm/bin/npm-cli.js" "$@"
EOF

chmod +x bin/npm
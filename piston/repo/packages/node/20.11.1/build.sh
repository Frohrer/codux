#!/bin/bash
PREFIX=$(realpath $(dirname $0))

# Create necessary directories for npm
mkdir -p "$PREFIX/home"
export HOME="$PREFIX/home"
mkdir -p "$HOME/.npm"

# Download and extract pre-built Node.js
curl "https://nodejs.org/dist/v20.11.1/node-v20.11.1-linux-x64.tar.xz" -o node.tar.xz
tar xf node.tar.xz --strip-components=1
rm node.tar.xz

# Create wrapper scripts with absolute paths
cat > packagemanager << 'EOF'
#!/bin/bash
PREFIX=$(dirname "$0")
export HOME="$PREFIX/home"
exec "$PREFIX/bin/npm" "$@"
EOF

cat > run << 'EOF'
#!/bin/bash
PREFIX=$(dirname "$0")
export HOME="$PREFIX/home"
exec "$PREFIX/bin/node" "$@"
EOF

chmod +x packagemanager run

# Initialize npm configuration
export PATH="$PREFIX/bin:$PATH"
export HOME="$PREFIX/home"
./bin/npm config set prefix "$PREFIX"
#!/bin/bash
PREFIX=$(realpath $(dirname $0))

mkdir -p build
cd build
curl "https://www.python.org/ftp/python/3.10.0/Python-3.10.0.tgz" -o python.tar.gz
tar xzf python.tar.gz --strip-components=1
rm python.tar.gz

./configure --prefix "$PREFIX" --with-ensurepip=install
make -j$(nproc)
make install -j$(nproc)
cd ..
rm -rf build

# Add bin directory to PATH temporarily for the initial pip installation
export PATH="$PREFIX/bin:$PATH"
bin/pip3 install requests

# Create wrapper scripts with absolute paths
cat > packagemanager << 'EOF'
#!/bin/bash
"$PREFIX/bin/pip3" "$@"
EOF

cat > run << 'EOF'
#!/bin/bash
"$PREFIX/bin/python3" "$@"
EOF

chmod +x packagemanager run
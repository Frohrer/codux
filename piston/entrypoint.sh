#!/bin/sh
set -e

# Function to check if Docker is running
is_docker_running() {
    docker info >/dev/null 2>&1
    return $?
}

# Function to remove Docker PID file if it exists
remove_docker_pid() {
    if [ -f "/var/run/docker.pid" ]; then
        echo "Docker PID file found. Removing it..."
        rm -f /var/run/docker.pid
    fi
}

# Check and clean up existing Docker process
remove_docker_pid

# Start containerd first
echo "Starting containerd..."
containerd > /dev/null 2>&1 &

# Wait for containerd to be ready
sleep 2

# Start the Docker daemon
echo "Starting Docker daemon..."
dockerd --containerd=/run/containerd/containerd.sock \
        --host=unix:///var/run/docker.sock \
        --host=tcp://0.0.0.0:2375 \
        --tls=false &

# Wait for Docker to be ready with timeout
echo "Waiting for Docker to be ready..."
timeout=30
while ! is_docker_running; do
    timeout=$(($timeout - 1))
    if [ $timeout -eq 0 ]; then
        echo "Failed to start Docker daemon"
        exit 1
    fi
    sleep 1
done

echo "Docker daemon started successfully"

# Run your application
echo "Running start script..."
./start.sh
wait
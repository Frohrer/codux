# Dockerfile
FROM debian:buster-slim
ENV DEBIAN_FRONTEND noninteractive

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential gcc binutils \
    curl git python3 python3-pip \
    libssl-dev zlib1g-dev libffi-dev \
    libreadline-dev libbz2-dev liblzma-dev \
    jq \  
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package building infrastructure
COPY . .
COPY install.sh mkindex.sh serve.py ./

RUN chmod +x packages/init && \
    chmod +x *.sh

EXPOSE 8000
ENTRYPOINT ["./install.sh"]
# KILN

A secure code execution engine for running LLM-generated code.

## Overview

Kiln extends the Piston engine to create a secure platform for executing publicly submitted code. Built with LLM integration in mind, it features:

- Secure code execution environment
- Support for multiple language versions
- Streamlit UI hosting and proxying
- Comprehensive API
- Local execution - your code never leaves your machine

## Getting Started

Kiln will build all supported runtimes on first startup, therefore expect a 5-10 minute wait the first time you run it.

1. **Clone the Repository**

   ```bash
   git clone https://github.com/frohrer/kiln.git
   cd kiln
   ```

2. **Build Runtimes**
   You only have to do this once.

   ```bash
   chmod +x install.sh
   ./install.sh
   ```

3. **Start the Service**

   ```bash
   docker compose up -d
   ```

4. **Access the Services**

   - API Endpoint: `http://localhost:2000`
   - Web Interface: `http://localhost:8080`

5. **Verify Installation**
   ```bash
   curl http://localhost:2000/health
   ```

## Security

_Documentation in progress_

## Supported Languages

| Language   | Version | Runtime    | Installed by default |
| ---------- | ------- | ---------- | -------------------- |
| javascript | 20.11.1 | node       | ✅                   |
| javascript | 15.10.0 | node       | ❌                   |
| javascript | 16.3.0  | node       | ❌                   |
| javascript | 18.15.0 | node       | ❌                   |
| python     | 2.7.18  | python     | ❌                   |
| python     | 3.5.10  | python     | ❌                   |
| python     | 3.9.1   | python     | ❌                   |
| python     | 3.9.4   | python     | ❌                   |
| python     | 3.10.0  | python     | ❌                   |
| python     | 3.11.11 | python     | ✅                   |
| python     | 3.11.0  | streamlit  | ✅                   |
| python     | 3.12.8  | python     | ❌                   |
| python     | 3.13.1  | python     | ❌                   |
| bash       | 5.2.0   | bash       | ✅                   |
| go         | 1.16.2  | go         | ✅                   |
| typescript | 4.2.3   | typescript | ❌                   |
| typescript | 5.0.3   | typescript | ✅                   |
| rust       | 1.50.0  | rust       | ❌                   |
| rust       | 1.56.1  | rust       | ❌                   |
| rust       | 1.62.0  | rust       | ❌                   |
| rust       | 1.63.0  | rust       | ❌                   |
| rust       | 1.65.0  | rust       | ❌                   |
| rust       | 1.68.2  | rust       | ✅                   |

## Status

This project is currently under active development. Stay tuned for updates!

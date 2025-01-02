# codux

A secure code execution engine for running LLM-generated code.

## Overview

codux extends the Piston engine to create a secure platform for executing publicly submitted code. Built with LLM integration in mind, it features:

- Secure code execution environment
- Support for multiple language versions
- Streamlit UI hosting and proxying
- Comprehensive API
- Local execution - your code never leaves your machine

## Getting Started

codux will build all supported runtimes on first startup, therefore expect a 5-10 minute wait the first time you run it.

1. **Clone the Repository**

   ```bash
   git clone https://github.com/frohrer/codux.git
   cd codux
   ```

2. **Start the Service**

   ```bash
   docker compose up -d
   ```

3. **Access the Services**

   - API Endpoint: `http://localhost:2000`
   - Web Interface: `http://localhost:8080`

4. **Verify Installation**
   ```bash
   curl http://localhost:2000/health
   ```

## Security

_Documentation in progress_

## Supported Languages

| Language   | Version | Runtime   |
| ---------- | ------- | --------- |
| JavaScript | 20.11.1 | node      |
| Python     | 3.9.4   | python    |
| Python     | 3.10.0  | python    |
| Python     | 3.11.0  | python    |
| Python     | 3.11.0  | streamlit |
| Python     | 3.11.11 | python    |
| Python     | 3.12.8  | python    |
| Python     | 3.13.1  | python    |
| Python     | 3.14.0  | python    |

## Status

This project is currently under active development. Stay tuned for updates!

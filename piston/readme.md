# Code Runner

A Docker-based code execution environment with an admin dashboard.

## Getting Started

### Prerequisites

- Docker
- Docker Compose

### Running the Project

To run the project, use the provided `docker-compose.yml` file:

```
docker-compose up
```

### Initializing New Packages

To initialize new packages, use the following command structure:

```
./piston build-pkg <package_name> <version>
```

For example, to initialize Node.js version 20.11.1:

```
./piston build-pkg node 20.11.1
```

### Accessing the Admin Dashboard

Once the project is running, you can access the code execution admin dashboard by visiting:

```
http://localhost:8000
```

# Apollo Project

## Description
Apollo is a GraphQL API built with NestJS and structured around Domain-Driven Design (DDD) principles. 

## File System Structure
The application code heavily adheres to DDD boundaries, split into distinct domain modules (`auth` and `users`) and a `common` utilities area:

- `src/auth/`
  - `application/`: Contains the use cases (e.g., Login, Verify) and the background Outbox workers.
  - `domain/`: Core domain logic, interfaces, Entities, and exceptions.
  - `infrastructure/`: Repository implementations bridging Drizzle (PG) and Valkey caches, plus external service adapters.
  - `presentation/`: GraphQL `AuthResolver` definitions, mappers, input structures, and guards.
  - `tests/`: End-to-end testing flows and worker integration tests.
- `src/users/`: User-specific domain boundaries, value objects, and base persistence.
- `src/config/`: Startup configurations (Module aggregators) injecting environment, DB, logging, and caches.
- `src/common/`: Common utilities including custom structured Winston loggers and interceptors.
- `nginx/`: Templates to facilitate deploying Apollo behind a high-performance reverse proxy.

## How to Run

### Local Development
To launch the complete environment (Database, Cache, API, Reverse Proxy) with live-reloading:
```bash
bun run start:dev
```
Once healthy, the development environment exposes the API at `http://localhost/graphql` where you can access the interactive GraphQL Playground.

### Production
To launch the optimized production builds:
```bash
docker compose up --build -d
```

### Running Tests
To run the end-to-end and integration test suites:
```bash
bun run test
```

## License
This project is licensed under the **GPL v3** License.

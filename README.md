# Apollo Project

## Description
Apollo is a high-performance GraphQL API built with NestJS, designed for a scalable social networking platform. It is strictly structured around **Domain-Driven Design (DDD)** and **Clean Architecture** principles, ensuring clear boundaries between business logic and infrastructure.

The project features a robust **Outbox Pattern** for reliable event processing, optimized **GraphQL DataLoaders** to eliminate N+1 query problems in nested social feeds.

## File System Structure
The application code adheres to strict DDD boundaries, organized into the following core modules:

- `src/auth/`: Complete authentication lifecycle, including registration, login, and password recovery.
  - `application/`: Use cases and background Outbox workers.
  - `domain/`: Core entities, value objects, and repository interfaces.
  - `infrastructure/`: Drizzle ORM (Postgres) and Valkey cache implementations.
  - `presentation/`: REST controller, guards, and DTO mappers.
- `src/users/`: Manages user accounts, profiles, and social relationships.
- `src/posts/`: Handles content creation and feed retrieval.
- `src/outbox/`: A cross-cutting module implementing the Outbox Pattern for reliable transactional messaging.
- `src/common/`: Shared utilities, custom structured loggers (Winston), and global interceptors.
- `src/config/`: Application bootstrap, environment configuration, and infrastructure provider injection.

## Technical Highlights
- **Performance**: Uses PostgreSQL window functions and `dataloader` batching to efficiently resolve complex nested social graphs in a single database round-trip.
- **Reliability**: Implements the Transactional Outbox pattern to ensure that side effects (like sending emails or updating caches) are eventually consistent with database transactions.

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

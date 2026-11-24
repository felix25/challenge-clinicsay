# ClinicSay Backend — Agent Instructions

## Project overview

Backend technical challenge for ClinicSay.

The application manages clinics, patients, appointments,
appointment reminders and inbound patient responses.

## Technology stack

- Node.js 24
- TypeScript
- NestJS
- PostgreSQL
- Prisma 6
- Luxon
- Jest and Supertest
- Docker Compose
- GitHub Actions

## Architecture

Follow hexagonal architecture and maintain clear boundaries
between domain, application and infrastructure.

- Domain contains business entities and business rules.
- Application contains use cases and ports.
- Infrastructure implements persistence, HTTP controllers
  and external service adapters.
- Dependencies must point toward the application and domain.
- Domain and use cases must remain independent of Prisma,
  PostgreSQL and HTTP transport details.
- Persistence must be replaceable through repository ports.
- Use dependency injection to connect ports and adapters.

## Business rules

- Preserve the API contract defined in openapi.yaml.
- Calculate reminder schedules using the clinic's timezone.
- Respect calendar-day calculations and DST transitions.
- Respect quiet hours for initial reminder scheduling.
- Do not apply quiet hours to retries.
- Preserve reminder idempotency across retries.
- Prevent duplicate processing of inbound messages.
- Use the Clock port for business time calculations.
- Register the test clock endpoint only in test mode.

## Development workflow

- Prefer test-driven development for business rules.
- Write regression tests before fixing identified bugs.
- Keep changes focused on the requested task.
- Avoid unnecessary abstractions and dependencies.
- Do not weaken TypeScript validation to bypass errors.
- Do not modify the supplied simulated message provider.
- Do not change the supplied OpenAPI contract.
- Do not introduce features outside the challenge scope.

## Database

- Keep Prisma-specific code in infrastructure adapters.
- Preserve transactional consistency.
- Maintain concurrency and idempotency guarantees.
- Use migrations for schema changes.
- Never execute destructive operations against non-test databases.

## Testing

Unit and module integration tests must not depend on PostgreSQL.

E2E tests must use the isolated test infrastructure defined
in docker-compose.test.yml.

Run the following checks before completing a change:

    npm run lint
    npm run typecheck
    npm run build
    npm test -- --runInBand
    npm run test:e2e

Do not report tests as passing unless they have been executed
successfully.

## Git

- Keep commits small and focused.
- Use descriptive commit messages.
- Do not commit secrets or local environment files.
- Do not rewrite Git history without explicit authorization.
- Do not push changes without explicit authorization.

## Documentation

Keep the README consistent with the actual implementation.

Document architectural decisions, trade-offs, known limitations
and instructions required to reproduce the environment.

Do not claim functionality that has not been implemented
or verified.

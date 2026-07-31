# Blockers

## Dependency install and runtime

- Initial local `node_modules` was incomplete or not executable from the sandbox. Root `npm.cmd install` has since completed; backend `npm.cmd install` timed out but left enough installed for Prisma generation, backend build, lint, and tests to pass.
- Current Node is `v20.13.1`, while Vite 7 requires `^20.19.0 || >=22.12.0`. The build passes, but the engine warning remains and Node should be upgraded.
- `npm.ps1` is blocked by PowerShell execution policy, so verification commands must use `npm.cmd` unless policy is changed outside the repo.
- Docker Desktop Linux engine was initially unavailable. After Docker became available, default Redis host port `6379` was already allocated, so local Compose ports were moved to PostgreSQL `15432` and Redis `16379`.

## Scope not completed in this pass

- The full requirements describe a complete production e-commerce rebuild. This pass establishes the backend foundation and fixes known frontend import/type blockers, but it does not complete all commerce modules.
- The old Mongo/Mongoose backend has been removed; the Fastify/Prisma service is the only backend implementation.
- Frontend pages still depend on `src/data/products.ts` and local mock state in production paths.
- Authentication uses separate HttpOnly customer/admin access cookies. Refresh-token issuance and rotation are not implemented yet.
- Frontend and backend lint pass at the Phase 1 auth checkpoint.
- Prisma migrations now apply locally. The first migration only creates the required `citext` extension; the second generated migration creates the application tables and indexes.

## Services required for final verification

- PostgreSQL and Redis must be running before migration, seed, and backend integration tests can pass.
- Required commands once dependencies and services are available:
  - `npm.cmd install`
  - `cd backend && npm.cmd install`
  - `docker compose up -d`
  - `cd backend && npm.cmd run db:migrate && npm.cmd run db:seed`
  - `npm.cmd run build`
  - `npm.cmd run lint`
  - `npm.cmd test`

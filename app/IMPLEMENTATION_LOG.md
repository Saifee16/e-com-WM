# Implementation Log

## Phase 0 - Baseline inspection

- Project root is `app/`; the outer `F:\E-Commerce React` folder only contains this app folder.
- Frontend is Vite + React + TypeScript with strict TypeScript settings in `tsconfig.app.json`.
- Existing backend is CommonJS Express + Mongo/Mongoose files under `backend/` and has only a failing placeholder `test` script.
- Initial `npm run build`, `npm run lint`, and `npm test` were attempted with `npm.cmd` because PowerShell blocks `npm.ps1`.
- Baseline command results:
  - `npm.cmd run build`: failed because the local dependency install is incomplete/unusable in the sandbox (`vite/client` and `node` types not found; TypeScript reported `erasableSyntaxOnly` as unknown).
  - `npm.cmd run lint`: failed because `eslint` is not recognized from local binaries.
  - `npm.cmd test`: failed because the frontend has no `test` script.
  - `backend npm test`: failed because the backend has only the default placeholder test.

## Phase 1 - Frontend stabilization started

- Added missing `motion` imports to account and admin layouts.
- Added missing `ChevronRight` import to product detail.
- Converted `Product` import in product listing to a type-only import.
- Converted Axios type imports to type-only imports and replaced several API service `any` types with `Record<string, unknown>` aliases.

## Phase 2 - Backend foundation started

- Added a TypeScript Fastify backend package scaffold targeting PostgreSQL via Prisma.
- Added environment validation, Prisma client wrapper, response envelope helpers, health routes, and graceful shutdown entrypoint.
- Added Prisma schema covering users, refresh tokens, products, variants, carts, orders, payments, shipments, reviews, wishlists, inventory movements, and audit logs.
- Added a seed script with local admin/customer users, categories, brands, products, variants, images, stock, and promo code.
- Added Docker Compose for PostgreSQL and Redis.
- Added backend health route test.

## Phase 3 - Scripts, verification, and dependency audit

- Updated root scripts so `build`, `lint`, and `test` run frontend and backend commands.
- Added `vitest.config.ts` so frontend test discovery excludes `backend/` and passes cleanly when no frontend tests exist yet.
- Ran `npm.cmd install` at the root and `backend`; root install completed, backend install timed out after creating `node_modules` and `package-lock.json`, then Prisma generation/build/test succeeded.
- Ran `npm.cmd audit fix` without `--force`; production audit now reports zero vulnerabilities.

## Final command results in this pass

- `npm.cmd run db:generate` in `backend/`: passed.
- `npm.cmd run build` from repo root: passed.
  - Warning: Node.js is `20.13.1`; Vite requires `20.19+` or `22.12+`.
  - Warning: Browserslist data is stale.
  - Warning: main frontend JS chunk is larger than 500 kB.
- `npm.cmd test` from repo root: passed.
  - Frontend: no test files found, exits with code 0 by config.
  - Backend: 1 health route test passed.
- `npm.cmd audit --omit=dev` from repo root: passed with `0 vulnerabilities`.
- `npm.cmd run lint` from repo root: failed on existing frontend lint debt; 52 errors remain.
- `npm.cmd run lint` in `backend/`: passed.
- `docker compose up -d --build`: initially failed because Docker Desktop Linux engine was not running or not installed (`//./pipe/dockerDesktopLinuxEngine` missing).
- After Docker became available, `docker compose up -d` initially hit a Redis `6379` host-port collision. Compose host ports were changed to PostgreSQL `15432` and Redis `16379`.
- `docker compose up -d --force-recreate`: passed after the port change.
- `npm.cmd run db:migrate -- --name init`: passed and generated/applied `20260630230827_init`.
- `npm.cmd run db:seed`: passed.
- `npm.cmd run db:migrate`: passed as an exact no-op check, reporting the database already in sync.

## Phase 4 - Minimal auth login fix

- Fixed frontend API base URL fallback from `http://localhost:5000/api` to `http://localhost:4000/api`.
- Added minimal database-backed Fastify auth routes under `/api/auth`:
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `GET /api/auth/profile`
  - `GET /api/auth/me`
  - `PUT /api/auth/profile`
  - `PUT /api/auth/password`
  - `POST /api/auth/logout`
- Added HMAC-signed short-lived bearer access tokens for the temporary frontend `localStorage` auth flow.
- Verified seeded customer login against the running backend:
  - `customer@example.com` / `Customer123!Local`: passed, returned safe user profile and token.
- Verified seeded admin login against the running backend:
  - `admin@example.com` / `Admin123!Local`: passed, returned `isAdmin: true`.
- `npm.cmd run build`: passed after the auth changes.
- `npm.cmd test`: passed after the auth changes.

## Known limitations

- Payments are intentionally COD-only; no payment gateway or webhook abstraction is planned.
- Frontend is not yet fully API-backed and still uses mock/static production paths in several pages.
- Local verification requires a clean dependency install and Node version compatible with Vite 7 (`^20.19.0` or `>=22.12.0`).
- Migrations now exist, but there are two initial migrations: `000001_init` creates the PostgreSQL `citext` extension, and `20260630230827_init` contains the generated table/index schema.
- After Docker became available, the first Compose run hit a host Redis `6379` collision. Local Docker host ports were moved to PostgreSQL `15432` and Redis `16379`.

## Phase 5 - Auth realm separation

- Customer login is restricted to `CUSTOMER` accounts and returns `403 ADMIN_LOGIN_REQUIRED` for administrator accounts.
- Admin login moved to `/api/admin/auth/login` and its Prisma query is scoped to `ADMIN`/`SUPER_ADMIN`.
- Customer and admin access tokens use separate signed audiences and separate HttpOnly cookies:
  - `accessToken`, path `/api`
  - `adminAccessToken`, path `/api/admin`
- Added separate frontend customer/admin auth contexts and Axios clients so both sessions can coexist.
- Moved product mutations and admin order operations under `/api/admin`.
- Replaced inline authorization calls with Fastify route/plugin `preHandler` hooks.
- Removed the inactive Express/Mongo backend and its fallback JWT secret.
- Added focused auth-realm tests covering 401, 403, query-level role scoping, and simultaneous sessions.

## Phase 4 - Customer account and support flows

- Added rotating customer/admin refresh sessions with replay revocation, logout revocation, and password-change revocation.
- Added expiring, single-use password-reset tokens with SMTP delivery and a local-development link fallback.
- Wired wishlist and address-book CRUD, product reviews, order cancellation, and return requests through the API and frontend.
- Unified complaints and Contact Us submissions as support tickets with `OPEN`, `IN_PROGRESS`, and `RESOLVED` states.
- Preserved guest support tickets and guest order returns in the admin queues.
- Return approval records a manually completed cash/bank refund; the application does not transfer funds.
- Removed the inactive payment-provider abstraction and kept checkout COD-only.
- Added the first frontend Vitest/Testing Library suite for the Phase 4 flows.

# Pre-Deployment Checklist

## Overall Status

READY WITH MANUAL STEPS

The repository builds, lints, type-checks, and passes all automated tests. Checkout, OAuth, admin RBAC, rate limiting, security headers, production configuration, responsive behavior, and error handling were hardened during this pass. Production credentials, the final domain, OAuth console settings, SMTP delivery, TLS/DNS, backups, and live end-to-end checks still must be completed before traffic is enabled.

## 🔴 Blockers

### Production infrastructure and secrets are not yet provisioned
- Location: deployment platform and production environment
- Problem: the repository intentionally contains placeholders rather than production database, JWT, SMTP, OAuth, DNS, and domain values.
- Risk: the application cannot safely serve production traffic until these values and services exist.
- Fix performed: complete root and application `.env.example` files were added/updated; production Compose now passes all required service variables and fails closed when critical variables are absent.
- Remaining action: provision the services and secrets in this checklist, deploy migrations, configure DNS/TLS, and complete the live tests below.

### External identity and email flows require live-provider verification
- Location: `/login`, `/register`, `/forgot-password`, `/admin/login`
- Problem: Google, Facebook, and SMTP cannot be proven end-to-end without production provider accounts and credentials.
- Risk: social login or password reset could fail after launch because of console-side configuration.
- Fix performed: Google PKCE/state validation and Facebook state validation were implemented; exact environment names and callback paths are documented.
- Remaining action: configure both provider consoles and SMTP, then perform every identity test under “Manual Tests Required.”

## 🟠 Should Fix Before Launch

### React Router advisory must be monitored
- Location: `app/package.json`, `react-router-dom@7.18.2`
- Problem: `npm audit` reports two high findings for an RSC-mode CSRF advisory. The application is a client-only Vite `BrowserRouter` SPA and does not use React Server Components, React Router framework actions, or an RSC server, so the vulnerable execution path is absent. The installed release is the latest available version; downgrading to 7.11.0 reintroduces numerous open-redirect/XSS advisories.
- Risk: no known reachable production path in this architecture, but the audit remains non-zero.
- Fix performed: upgraded from 7.11.0 to the latest 7.18.2 and removed the older applicable advisory set.
- Remaining action: upgrade as soon as a patched release is published and rerun `npm audit --omit=dev`.

### No CI/CD workflow is committed
- Location: repository root; no `.github/workflows` or equivalent pipeline
- Problem: validation currently depends on a manual local run.
- Risk: future changes could be deployed without lint, tests, build, or dependency review.
- Fix performed: none; introducing an organization-specific deployment workflow without knowing the target registry/host would be speculative.
- Remaining action: configure CI to run clean installs, Prisma generation, lint, TypeScript, frontend tests, backend tests with PostgreSQL, production build, and dependency audits.

### Production catalog operations need an agreed category/inventory process
- Location: admin UI and `/api/admin/*`
- Problem: the existing product, order, user, return, and contact-message surfaces were retained. Categories do not have a separate admin CRUD screen; inventory is maintained through product variants and order transitions rather than a standalone inventory page.
- Risk: operators need a documented process for adding categories and correcting stock.
- Fix performed: product admin reads now use an authenticated, server-paginated endpoint; order cancellation safely restores stock and records inventory movement.
- Remaining action: confirm that seed/database-managed categories and variant-based inventory are acceptable for launch, or schedule dedicated admin screens.

## 🟡 Nice to Have

- Add production observability/error tracking and alerting; no analytics or monitoring provider is currently configured.
- Add full admin pagination controls; the API is paginated, but some admin screens use a relatively large first page.
- Move specialized price/rating catalog ordering fully into database-native pagination before the catalog becomes large.
- Run Lighthouse/WebPageTest against the final CDN/domain with real product imagery and production data.
- Add automated browser tests for OAuth-provider stubs and the responsive admin UI.
- Replace the public Gmail contact address with a domain-owned support mailbox when available.

## ✅ Verified

- Architecture: React 19, TypeScript, Vite 7, React Router 7, Tailwind CSS, React Hook Form/Zod frontend; Node.js/Fastify 5, TypeScript, Prisma 6, PostgreSQL backend.
- Package manager: npm, with separate frontend and backend lockfiles.
- Authentication: custom email/password and cookie JWT sessions with refresh-token rotation; Google and Facebook OAuth; Argon2 password hashing.
- Payment: cash on delivery only. There is no external payment gateway, payment webhook, or payment secret in active code.
- Email: Nodemailer/SMTP for password reset and transactional email.
- Storage/images: remote product image URLs; no dedicated storage provider. Existing product photography/placeholders were preserved.
- State: React Context for auth, admin auth, cart, and toast state.
- Testing: Vitest with jsdom frontend tests and PostgreSQL-backed Fastify integration tests.
- Hosting: Docker Compose production stack with Nginx, API, PostgreSQL, Redis, and a migration job. TLS is expected at the external hosting/load-balancer edge.
- CI/CD: none detected.
- Admin API groups are protected by server-side authentication and role checks; tests prove unauthenticated `401`, customer `403`, and administrator success.
- CSRF double-submit validation protects cookie-authenticated mutations; cookies are `httpOnly`, configurable `secure`, and `sameSite` constrained.
- Google OAuth now uses random, signed, short-lived state and PKCE S256; Facebook uses random signed state.
- Existing blocked/deleted users cannot regain access through OAuth.
- Production guest carts no longer trust a caller-controlled `X-Guest-Id`; they use a signed HTTP-only cookie.
- Checkout recalculates price, tax, discounts, promo limits, shipping, inventory, and totals server-side under database locks.
- Checkout requires a UUID idempotency key to prevent duplicate order submission.
- Admin order state changes enforce legal transitions; pre-shipment cancellation restores inventory atomically.
- Draft/archived products are not exposed by public product-detail routes.
- Product image inputs are capped and require HTTPS URLs.
- Global, login, password-reset, signup, contact, and guest-return rate limits are configured.
- Production Swagger UI is disabled; no debug/test login or mock-auth route was found.
- CORS uses the configured frontend origin with credentials and does not use wildcard origins.
- Nginx sets CSP, HSTS, frame protection, content-type, referrer, permissions, and cache-control headers.
- User-specific/API responses are marked `no-store`; hashed assets are cached immutably.
- Responsive rendering was inspected at 375 px, 768 px, and 1440 px; no document-width overflow was detected.
- Mobile navigation opens/closes correctly with 44 px navigation targets; public, auth, cart, and admin-login layouts render without clipping.
- Accessibility fixes added names to icon-only navigation/password controls and associated labels with authentication inputs.
- Placeholder social links were removed; a public `/data-deletion` instructions page was added for Meta compliance.
- Route-level code splitting reduced the main JavaScript output from about 848 kB to about 455 kB raw (about 149 kB gzip).
- No local product image asset replacements or large duplicate local photography were introduced.
- No hardcoded production credential or private key was found in the reviewed source/configuration files.
- Production Docker Compose interpolation validates successfully with disposable placeholder values.

## Environment Variables

| Variable | Required | Purpose | Where to obtain it | Production value needed |
|----------|----------|---------|--------------------|-------------------------|
| `NODE_ENV` | Yes | Runtime mode | Deployment configuration | `production` |
| `PORT` | Yes | Fastify listen port | Deployment configuration | Usually `4000` |
| `API_BASE_URL` | Yes | Public API origin/base URL and generated links | Final domain/hosting | HTTPS public origin, normally `https://YOUR_DOMAIN` |
| `FRONTEND_URL` | Yes | Allowed CORS/frontend origin | Final domain/hosting | `https://YOUR_DOMAIN` |
| `VITE_API_BASE_URL` | Yes at build | Browser API base | Deployment topology | `/api` for supplied Nginx topology |
| `FRONTEND_PORT` | Compose | Published Nginx port | Hosting configuration | Usually `80`, `8080`, or provider-assigned mapping |
| `POSTGRES_USER` | Compose | PostgreSQL service user | Generate/provision in database platform | Non-default unique user |
| `POSTGRES_PASSWORD` | Compose | PostgreSQL service password | Generate/store in secret manager | Long random secret |
| `POSTGRES_DB` | Compose | PostgreSQL database name | Database provisioning | Production database name |
| `DATABASE_URL` | Yes | Prisma PostgreSQL connection | Database provider | Production PostgreSQL URL with TLS options where required |
| `REDIS_URL` | Yes | Redis/BullMQ connection | Redis provider or Compose | Production Redis URL |
| `JWT_ACCESS_SECRET` | Yes | Access-token signing | Cryptographic secret generator | Unique random value, at least 32 bytes; 64+ characters recommended |
| `JWT_REFRESH_SECRET` | Yes | Refresh-token signing | Cryptographic secret generator | Different unique random value, at least 32 bytes |
| `TRUST_PROXY_HOPS` | Yes | Trusted proxy-chain depth | Hosting topology | `1` for supplied Nginx-only hop; adjust exactly to provider topology |
| `ACCESS_TOKEN_TTL_SECONDS` | Yes/default | Access session lifetime | Security policy | `900` unless policy differs |
| `REFRESH_TOKEN_TTL_DAYS` | Yes/default | Refresh session lifetime | Security policy | `30` unless policy differs |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | Yes/default | Reset link expiry | Security policy | `30` |
| `COOKIE_DOMAIN` | Conditional | Shared cookie domain | Final domain plan | Blank for host-only cookies; otherwise exact parent domain |
| `COOKIE_SECURE` | Yes | Secure-cookie enforcement | Deployment configuration | `true` |
| `COOKIE_SAME_SITE` | Yes | Cookie cross-site policy | OAuth/topology decision | `lax` for current same-origin design |
| `RATE_LIMIT_GLOBAL_MAX` | Yes/default | Global request ceiling | Capacity/security policy | Start at `300` per configured window and tune from metrics |
| `RATE_LIMIT_GLOBAL_WINDOW_SECONDS` | Yes/default | Global limit window | Capacity/security policy | `60` |
| `RATE_LIMIT_LOGIN_MAX` | Yes/default | Login/signup abuse limit | Security policy | `10` |
| `RATE_LIMIT_LOGIN_WINDOW_SECONDS` | Yes/default | Login limit window | Security policy | `60` |
| `PASSWORD_RESET_IP_MAX` | Yes/default | Reset requests per IP | Security policy | `5` |
| `PASSWORD_RESET_IP_WINDOW_SECONDS` | Yes/default | Reset IP window | Security policy | `900` |
| `PASSWORD_RESET_ACCOUNT_COOLDOWN_SECONDS` | Yes/default | Per-account reset cooldown | Security policy | `300` |
| `PUBLIC_FORM_RATE_LIMIT_MAX` | Yes/default | Contact/guest-return abuse limit | Security policy | `10` |
| `PUBLIC_FORM_RATE_LIMIT_WINDOW_SECONDS` | Yes/default | Public-form limit window | Security policy | `900` |
| `EMAIL_FROM` | Yes | Transactional sender | Verified email domain/provider | Verified sender address |
| `RESEND_API_KEY` | Yes for email flows | Resend sending credential | Resend dashboard | Secret-manager value |
| `GOOGLE_CLIENT_ID` | Yes for Google login | Google OAuth client | Google Cloud Console | Web application client ID |
| `GOOGLE_CLIENT_SECRET` | Yes for Google login | Google OAuth secret | Google Cloud Console | Secret-manager value |
| `GOOGLE_REDIRECT_URI` | Yes for Google login | Exact OAuth callback | Final domain | `https://YOUR_DOMAIN/auth/google/callback` |
| `FACEBOOK_APP_ID` | Yes for Facebook login | Meta application ID | Meta for Developers | App ID |
| `FACEBOOK_APP_SECRET` | Yes for Facebook login | Meta application secret | Meta for Developers | Secret-manager value |
| `FACEBOOK_REDIRECT_URI` | Yes for Facebook login | Exact OAuth callback | Final domain | `https://YOUR_DOMAIN/auth/facebook/callback` |
| `FACEBOOK_GRAPH_API_VERSION` | Yes for Facebook login | Versioned Meta endpoints | Meta app dashboard/current supported version | Exact assigned version such as `vXX.X` |

## Google OAuth Setup

- Client ID: `GOOGLE_CLIENT_ID`
- Client secret: `GOOGLE_CLIENT_SECRET`
- Authorized JavaScript origins: development `http://localhost:5173`; production `https://YOUR_PRODUCTION_DOMAIN`
- Authorized redirect URI: development `http://localhost:5173/auth/google/callback`; production `https://YOUR_PRODUCTION_DOMAIN/auth/google/callback`
- Manual Google Cloud Console actions: create a Web application OAuth client, configure the consent screen and support contacts, add both exact origins and redirect URIs, publish/verify the consent screen as required, store credentials in the deployment secret manager, and test customer plus existing-admin sign-in.

## Facebook Login Setup

- App ID: `FACEBOOK_APP_ID`
- App secret: `FACEBOOK_APP_SECRET`
- Valid OAuth redirect URI: development `http://localhost:5173/auth/facebook/callback`; production `https://YOUR_PRODUCTION_DOMAIN/auth/facebook/callback`
- App domain: `YOUR_PRODUCTION_DOMAIN` (host only)
- Live mode status: switch the Meta app to Live only after required settings and test accounts pass.
- Privacy Policy requirement: `https://YOUR_PRODUCTION_DOMAIN/privacy`
- Data deletion requirement: `https://YOUR_PRODUCTION_DOMAIN/data-deletion`
- Manual Meta Developers actions: add Facebook Login for Web, configure the exact redirect URI, app domain, site URL, privacy policy, terms URL (`/terms`), and data-deletion URL; select `FACEBOOK_GRAPH_API_VERSION`; confirm the app can receive email permission for the intended audience; complete business verification/app review if Meta requires it; then switch to Live and test customer plus existing-admin access.

## Other Third-Party Credentials

### Database

Provision PostgreSQL and set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `DATABASE_URL`. Use provider-required TLS parameters and restrict network access to the API/migration workloads.

### Payment Provider

None. The implemented and tested payment method is cash on delivery. Do not add unused payment secrets or webhooks.

### Email

Provision a Resend sending API key and verified sending domain; set `EMAIL_FROM` and `RESEND_API_KEY`. Configure SPF, DKIM, and DMARC.

### Storage

No storage provider is integrated. Product images are externally hosted HTTPS URLs; confirm those hosts permit production hotlinking and have suitable CDN/cache behavior.

## Deployment / Hosting Steps

- [ ] Use Node.js `20.19.x` or `22.13+`; supplied Dockerfiles pin `20.19-alpine`.
- [ ] Copy placeholders into the hosting secret manager; never commit populated `.env` files.
- [ ] Set `FRONTEND_URL`, `API_BASE_URL`, and OAuth redirects to the final HTTPS domain.
- [ ] Build with `npm ci`, `npm --prefix backend ci`, `npm --prefix backend run db:generate`, and `npm run build` (or build the supplied images).
- [ ] Run the production Compose migration job before starting/rolling the API.
- [ ] Start PostgreSQL/managed DB, Redis, API, and Nginx/frontend services.
- [ ] Confirm `/api/health` returns success through the public reverse proxy.
- [ ] Confirm `/docs` is unavailable in production.
- [ ] Configure centralized logs, uptime monitoring, and alerts.
- [ ] Add a CI/CD pipeline with approval and rollback stages.

## Domain / DNS / SSL

- [ ] Final domain selected and `A`/`AAAA`/`CNAME` records configured.
- [ ] Valid TLS certificate installed at the hosting edge/load balancer.
- [ ] HTTP redirects permanently to HTTPS before application traffic.
- [ ] `API_BASE_URL`, `FRONTEND_URL`, cookie domain, and provider callbacks use the exact HTTPS host.
- [ ] HSTS is emitted only after HTTPS is functioning on the final host.
- [ ] CDN/proxy preserves cookies and does not cache `/api` or account/admin HTML responses.

## Database Deployment

- [ ] Production database created
- [ ] Environment variable configured
- [ ] Migrations applied
- [ ] Production seed behavior verified
- [ ] Backups configured
- [ ] Point-in-time recovery and restore procedure tested
- [ ] Seed script reviewed before execution; do not run development seed data automatically in production

## Security Verification

- [x] Admin RBAC verified server-side
- [x] Authentication endpoints protected
- [x] Secrets removed from repository
- [ ] Production CORS configured with the final `FRONTEND_URL`
- [ ] HTTPS enabled and externally tested
- [x] Repository-level rate limiting verified
- [ ] Edge/infrastructure rate limits and multi-instance behavior verified
- [x] Security headers configured in Nginx
- [ ] Security headers verified through the final CDN/proxy
- [x] CSRF, OAuth state, Google PKCE, refresh rotation, and cookie flags reviewed
- [x] Server recalculates checkout totals and locks inventory

## Manual Tests Required

### 1. Google customer sign-in — MANUAL VERIFICATION REQUIRED

1. Exact page/URL: `https://YOUR_PRODUCTION_DOMAIN/login`
2. Account type needed: ordinary Google customer account
3. Exact steps: click Google, approve consent, complete the callback, refresh the page, then sign out.
4. Expected result: the user returns to the storefront authenticated; refresh preserves the session; logout invalidates it; no localhost redirect occurs.

### 2. Google admin realm isolation — MANUAL VERIFICATION REQUIRED

1. Exact page/URL: `https://YOUR_PRODUCTION_DOMAIN/admin/login`
2. Account type needed: an existing active admin whose email matches Google, plus a non-admin account
3. Exact steps: sign in with the admin and open `/admin`; repeat with the non-admin.
4. Expected result: admin succeeds; non-admin receives a generic denial and cannot call admin APIs.

### 3. Facebook Login and Meta compliance — MANUAL VERIFICATION REQUIRED

1. Exact page/URL: `/login`, `/admin/login`, `/privacy`, `/terms`, `/data-deletion`
2. Account type needed: Meta test customer, existing Meta-email-matched admin, and non-admin
3. Exact steps: complete both login flows, check refresh/logout, verify Meta can crawl policy URLs, and submit a data-deletion support ticket.
4. Expected result: customer and existing admin enter only their correct realms; non-admin is denied; all compliance pages are public over HTTPS.

### 4. Email/password lifecycle — MANUAL VERIFICATION REQUIRED

1. Exact page/URL: `/register`, `/login`, `/forgot-password`, reset link, `/account/settings`
2. Account type needed: new customer email inbox
3. Exact steps: register; attempt duplicate registration and invalid login; request reset for known and unknown emails; use an expired/used token; change password; log out/in.
4. Expected result: no account enumeration, generic safe errors, one-time/expiring reset behavior, and successful SMTP delivery without raw server errors.

### 5. Customer shopping and COD order — MANUAL VERIFICATION REQUIRED

1. Exact page/URL: `/products`, a live `/products/:id`, cart drawer, `/checkout`, `/account/orders`
2. Account type needed: active customer; products with in-stock and out-of-stock variants
3. Exact steps: list/search/filter; open detail; add/change/remove; test empty cart; add product then change price/stock server-side; apply valid/invalid promo; submit COD twice rapidly; inspect history/detail.
4. Expected result: useful empty/error states, authoritative updated prices, invalid stock rejection, correct free shipping over Rs. 100,000, one order only, decremented stock, and order detail visibility only to the owner.

### 6. Admin operational pass — MANUAL VERIFICATION REQUIRED

1. Exact page/URL: `/admin`, `/admin/products`, `/admin/orders`, `/admin/users`, `/admin/returns`, `/admin/contact-messages`
2. Account type needed: admin and super-admin where role changes are tested
3. Exact steps: test empty/loading/failure states; create/update/delete a product and variants; search/filter lists; process an order through each legal state; cancel a pre-shipment order; update user status/role; process return/contact records; manually call the same APIs as customer/anonymous.
4. Expected result: correct validation and 404/409 messages, server-side `401`/`403`, stock restoration on cancellation, protected super-admin actions, and responsive tables/modals at 375/768/desktop.

### 7. Production edge, email, and resilience — MANUAL VERIFICATION REQUIRED

1. Exact page/URL: public origin and `/api/health`
2. Account type needed: none, customer, and admin
3. Exact steps: inspect TLS, headers, cache headers, CORS from allowed/disallowed origins, rate-limit responses, SMTP delivery, database backup/restore, API restart, and network failures during cart/checkout.
4. Expected result: HTTPS-only traffic, correct security headers, no public caching of private data, disallowed CORS blocked, useful UI errors, recoverable deployment, and verified restore.

## Commands Executed

```text
npm.cmd ci                                      (app)
npm.cmd ci                                      (app/backend)
npm.cmd run db:generate                         (app/backend)
npm.cmd install --package-lock-only --ignore-scripts
npm.cmd install react-router-dom@7.18.2 --save-exact
npm.cmd audit fix                               (app and app/backend; no --force)
npm.cmd run lint
npm.cmd exec -- tsc -b
npm.cmd run test:frontend
npm.cmd run test                                (app/backend)
npm.cmd run build
npm.cmd audit --omit=dev --audit-level=high     (app and app/backend)
npm.cmd audit --audit-level=high                (app and app/backend)
docker compose -f docker-compose.prod.yml config --quiet
git -c safe.directory='F:/E-Commerce React' diff --check
Rendered browser QA at 375x812, 768x900, and 1440x900
```

## Validation Results

* Lint: PASS — frontend and backend ESLint, zero errors.
* Type check: PASS — frontend `tsc -b` and backend TypeScript build.
* Tests: PASS — frontend 1 file/8 tests; backend 5 files/18 PostgreSQL-backed tests.
* Production build: PASS — Vite 2,280 modules transformed; main JS about 455.31 kB raw/148.89 kB gzip; backend compiled.
* Dependency audit: backend production/full PASS with 0 vulnerabilities after non-breaking remediation. Frontend reports 2 high findings for the React Router RSC-only advisory described above; the installed 7.18.2 is latest and the project has no RSC/action server path. No forced downgrade was applied.
* Docker Compose config: PASS with disposable non-secret placeholder values. Real production values are still required.

## Files Changed

- `.env.example` — complete root production variable inventory without secrets.
- `.gitignore` — protects real environment files while retaining examples.
- `app/.env.example` — complete Compose/frontend/backend deployment variables.
- `app/Dockerfile` — pinned supported Node 20.19 image.
- `app/backend/.env.example` — complete direct-backend variables including Facebook and abuse limits.
- `app/backend/Dockerfile` — pinned supported Node 20.19 build/runtime images.
- `app/backend/package.json` — declared supported Node runtime.
- `app/backend/package-lock.json` — lockfile/development advisory remediation.
- `app/backend/src/app.ts` — production docs restriction, CORS/header hardening, and removal of diagnostic mutation logging.
- `app/backend/src/config/env.ts` — Facebook, public-form limits, and production HTTPS validation.
- `app/backend/src/endpoint-smoke.integration.test.ts` — validates idempotent checkout and legal order transitions.
- `app/backend/src/modules/admin/auth-routes.ts` — hardened Google state flow and added Facebook admin OAuth.
- `app/backend/src/modules/admin/routes.ts` — authenticated paginated product reads and safer admin mutations/order state handling.
- `app/backend/src/modules/auth/facebook.ts` — Facebook OAuth implementation.
- `app/backend/src/modules/auth/google.ts` — signed state and PKCE implementation.
- `app/backend/src/modules/auth/oauth-context.ts` — signed short-lived OAuth context cookies.
- `app/backend/src/modules/auth/routes.ts` — Facebook customer OAuth, blocked-user checks, and signup limiting.
- `app/backend/src/modules/auth/session.ts` — session/cookie security support for the hardened auth flow.
- `app/backend/src/modules/cart/routes.ts` — authoritative promo totals, validation, concurrency, and signed guest behavior.
- `app/backend/src/modules/contact/routes.ts` — public form rate limiting.
- `app/backend/src/modules/orders/routes.ts` — idempotent checkout, server promo validation, inventory locking, and shipping consistency.
- `app/backend/src/modules/products/routes.ts` — public status enforcement, DB filtering/pagination, and secure image validation.
- `app/backend/vitest.config.ts` — deterministic single-worker database integration configuration.
- `app/docker-compose.prod.yml` — complete production OAuth/email/rate-limit environment propagation.
- `app/docker/nginx.conf` — security and caching headers plus immutable asset caching.
- `app/package.json` — latest React Router pin and supported Node engine.
- `app/package-lock.json` — React Router and non-breaking advisory remediation.
- `app/src/App.tsx` — route-level lazy loading and data-deletion route.
- `app/src/components/layout/Footer.tsx` — removed placeholder links and added data-deletion link.
- `app/src/components/layout/Navbar.tsx` — accessible icon controls and mobile menu state.
- `app/src/contexts/CartContext.tsx` — extended authoritative promo/shipping totals.
- `app/src/pages/Checkout.tsx` — idempotency, correct server-aligned totals, loading/errors, and honest completion copy.
- `app/src/pages/DataDeletion.tsx` — public Meta-compatible deletion instructions.
- `app/src/pages/GoogleCallback.tsx` — state-aware Google/Facebook callback handling for both realms.
- `app/src/pages/Home.tsx` — fixed React effect/lint issue without changing presentation.
- `app/src/pages/Login.tsx` — functional Facebook login, accessible fields, and accurate session UX.
- `app/src/pages/Register.tsx` — functional Facebook login and accessible registration controls.
- `app/src/pages/admin/Login.tsx` — accessible admin login fields.
- `app/src/pages/admin/Products.tsx` — uses the protected admin product listing.
- `app/src/services/api.ts` — OAuth providers, idempotency header, protected admin listing, and removal of caller-controlled guest ID.
- `app/src/types/index.ts` — authoritative discount/free-shipping total types.
- `app/vitest.config.ts` — deterministic frontend test execution.

Note: `app/backend/src/db/prisma.ts` was already modified before this audit (database connection retry behavior). It was preserved and validated but is not claimed as an audit change.

## Final Launch Recommendation

`READY AFTER THE MANUAL STEPS ABOVE`

Do not enable public traffic until production secrets/services, migrations, DNS/TLS, Google/Meta console settings, SMTP delivery, backups, and the listed live customer/admin tests are complete. The repository itself has no known reachable launch-blocking code defect; continue monitoring the React Router RSC advisory and upgrade when a patched release exists.

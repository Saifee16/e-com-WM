# E-Commerce React App

This repository contains a Vite/React storefront and a TypeScript backend scaffold targeting PostgreSQL.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm
- Docker Desktop or another Docker Compose runtime

## Local Setup

```bash
npm install
cd backend
npm install
cd ..
docker compose up -d
cd backend
npm run db:generate
npm run db:migrate
npm run db:seed
cd ..
npm run dev
```

Use `npm.cmd` instead of `npm` in PowerShell if script execution policy blocks `npm.ps1`.

PostgreSQL is published on host port `15432` and Redis on `16379` to avoid common local port conflicts with existing Postgres/Redis services.

## Production Compose

Copy `.env.example` to `.env` and replace every placeholder with deployment-specific values. Then run:

```bash
docker compose -f docker-compose.prod.yml up --build
```

The production frontend serves the Vite build on port `8080` and proxies `/api` to Fastify, so browser and API traffic are same-origin. Put a TLS terminator in front of that port and use the same HTTPS origin for `FRONTEND_URL` and `API_BASE_URL`; the production stack intentionally uses `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=lax`. PostgreSQL and Redis are not published to the host.

## Verification

```bash
npm run build
npm run lint
npm test
npm audit --omit=dev
```

Backend-only:

```bash
cd backend
npm run build
npm run lint
npm test
npm audit --omit=dev
```

## Local Seed Data

- Admin: `admin@example.com` / `Admin123!Local`
- Customer: `customer@example.com` / `Customer123!Local`
- Promo code: `WELCOME10`

These credentials are for local development only.

## Backend

The backend package uses:

- Fastify
- Prisma
- PostgreSQL
- Zod environment validation
- Fastify structured logging

Current implemented API:

- `GET /api/health`
- `GET /api/health/db`
- Customer auth under `/api/auth`
- Public catalogue under `/api/products`
- Customer/guest carts under `/api/cart`
- Customer checkout under `/api/orders` (guest carts merge after sign-in or registration)
- Admin auth and protected administration under `/api/admin`

Customer and admin sessions are intentionally separate:

- `accessToken` is scoped to `/api`.
- `adminAccessToken` is scoped to `/api/admin`.
- Tokens contain a signed audience and cannot be exchanged between realms.

Local HTTP development uses `COOKIE_SECURE=false` and `COOKIE_SAME_SITE=lax`. Production must terminate HTTPS and set `COOKIE_SECURE=true`. Keep `lax` for a same-site frontend/API deployment; use `none` only for a genuinely cross-site deployment, together with `Secure=true` and an explicitly reviewed cookie domain.

The Prisma schema models users, refresh tokens, products, variants, carts, promo codes, orders, order items, payments, shipments, reviews, wishlists, inventory movements, and audit logs.

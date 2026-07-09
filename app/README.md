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

The Prisma schema models users, refresh tokens, products, variants, carts, promo codes, orders, order items, payments, shipments, reviews, wishlists, inventory movements, and audit logs. Auth, cart, checkout, payment webhook, account, and admin API modules still need to be implemented on top of this foundation.

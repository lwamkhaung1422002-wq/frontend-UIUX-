# Local Development

This guide starts the complete General POS stack with the API on port `3108`
and the Vite frontend on port `5173`.

## Prerequisites

- Node.js 22.12 or later and npm
- PostgreSQL 15 or later, running locally

Create a database named `online_shop_local_dev`, or change `DATABASE_URL` in
`Api/.env` to your own local database.

## First-time setup

In one terminal:

```bash
cd Api
copy .env.local.example .env
npm install
npm run prisma:deploy
npm run db:seed:local
npm run dev
```

The API health endpoint is `http://localhost:3108/health`.

In a second terminal:

```bash
cd App
copy .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`, register a shop, and sign in. Then add a product,
save stock, and verify it appears in the Stock screen.

## Verification

```bash
cd App
npm run lint
npm run build

cd ../Api
npm run typecheck
npm run prisma:validate
npm run build
```

## Local data safety

Use `npm run db:backup:local` before a destructive local operation. The reset
script is intentionally local-only: `npm run db:reset:local`. Do not point these
commands at a production database.

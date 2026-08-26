# General POS Frontend

React 19, Vite, and Material UI web client for General POS. It connects to the
Express/Prisma API in `../Api` for authentication, catalogue, inventory, sales,
payments, and barcode lookup.

## Requirements

- Node.js 22.12 or later
- npm
- A running API and PostgreSQL database (see `../LOCAL_DEVELOPMENT.md`)

## Run locally

```bash
copy .env.example .env
npm install
npm run dev
```

The web client runs at `http://localhost:5173` and calls the API through the
same-origin `/api` proxy. Vite forwards that route to `http://localhost:3108`
by default.

## Environment

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Public API base path; use `/api` in production. |
| `VITE_API_PROXY_TARGET` | Local Vite proxy target, defaulting to `http://localhost:3108`. |

Keep `/api` in production and configure `../netlify.toml` to proxy it to the
deployed Railway API. This preserves same-origin refresh-cookie sessions.
Camera barcode scanning requires HTTPS outside localhost.

## Checks

```bash
npm run lint
npm run build
```

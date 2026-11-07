# PennyKu

PennyKu is a personal finance tracker for managing wallets and recording income and expenses. The web app is built with React and TypeScript; its API is an Express and TypeScript service backed by PostgreSQL and authenticated with Neon Auth.

## Repository layout

- `apps/web` — React/Vite client, authentication UI, dashboard, wallets, and transactions.
- `apps/api` — Express API, authentication middleware, request validation, and PostgreSQL access.
- `apps/api/database/migrations` — ordered SQL schema migrations and default category seed data.

## Requirements

- Node.js and npm (npm workspaces are used at the repository root).
- A PostgreSQL database configured for the schema in `apps/api/database/migrations`.
- Neon Auth configuration for the client and API.

## Configuration

Create local environment files; do not commit real credentials.

For the API, copy `apps/api/.env.example` to `apps/api/.env` and configure:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEON_AUTH_JWKS_URL` | Neon Auth JSON Web Key Set URL used to verify API tokens |
| `NEON_AUTH_ISSUER` | Expected token issuer |
| `PORT` | API port; defaults to `3000` |
| `NODE_ENV` | Runtime mode; defaults to `development` |

For the web client, create `apps/web/.env` with:

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL of the API, such as `http://localhost:3000` |
| `VITE_NEON_AUTH_URL` | Neon Auth URL used by the client |

## Install and run

Install dependencies from the repository root:

```sh
npm install
```

Apply database migrations after configuring the API environment:

```sh
npm run migrate
```

Start both development servers:

```sh
npm run dev
```

The API defaults to port `3000`; Vite prints the web development URL when it starts. You can start either workspace separately with `npm run dev:api` or `npm run dev:web`.

## Checks

From the repository root:

```sh
npm run typecheck
npm test
```

The web workspace also provides build and lint scripts:

```sh
cd apps/web
npm run build
npm run lint
```

The API test suite uses Vitest. Its database-backed tests require a configured test database and test user; see `apps/api/src/test/setup-env.ts` for the expected `.env.test` location.

## API overview

The API exposes a public `GET /` health response. Wallet, category, and transaction routes are mounted under `/api` and require a Neon Auth bearer token. Wallets are scoped to their owner; transactions are associated with wallets, and default categories are shared while user categories can be owner-specific.

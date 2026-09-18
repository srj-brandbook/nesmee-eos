# SaaS Boilerplate

Reusable production foundation for future SaaS products.

- `frontend/` — Next.js App Router (JavaScript, Tailwind)
- `backend/` — Express REST API at `/api/v1` (JavaScript, MongoDB, Mongoose)

The apps are independently deployable and can later become separate repositories. MongoDB is accessed only by Express.

## Quick start

1. Copy environment files:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
```

2. Start MongoDB and Mailhog (recommended):

```bash
docker compose up mongo mailhog
```

Mailhog UI: http://localhost:8025

3. Install, seed, and run:

```bash
cd backend
npm install
npm run seed
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:5000
- Health: http://localhost:5000/health

Default Super Admin (from `.env`): `admin@example.com` / `ChangeMeNow!23`

In development the Next.js app rewrites `/api/*` to `http://localhost:5000/api/*` so session cookies stay first-party.

## Documentation

See [`docs/`](docs/README.md) for architecture, auth, API, and how to add a module.

## Scripts

| App | Command | Purpose |
|---|---|---|
| backend | `npm run dev` | Nodemon API on :5000 |
| backend | `npm run seed` | Permissions, roles, Super Admin |
| backend | `npm test` | Jest + Supertest |
| frontend | `npm run dev` | Next.js on :3000 |
| frontend | `npm test` | Jest + Testing Library |
| frontend | `npm run test:e2e` | Playwright (apps must be running) |

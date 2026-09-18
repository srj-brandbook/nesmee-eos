# Backend

Layered Express API.

```
Route → Middleware → Controller → Service → Model → MongoDB
```

## Folders

- `src/modules/<name>/` — routes, controller, service, validator
- `src/models/` — Mongoose schemas
- `src/middleware/` — auth, permissions, validation, errors
- `src/utils/` — envelope, hashing, mailer
- `src/seeds/` — permissions, roles, Super Admin

Controllers stay thin. Services own business rules and audit writes.

## Run

```bash
npm run dev
npm run seed
npm test
```

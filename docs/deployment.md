# Deployment

Frontend and backend deploy independently.

## Frontend

- Host: Vercel or any Node host
- Env: `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_API_URL` (empty if a reverse proxy exposes `/api`)

## Backend

- Host: Render, Railway, Fly, or a VM
- Env: see `backend/.env.example`
- Process: `npm start`
- Must reach MongoDB and SMTP

## Production cookies

- `COOKIE_SECURE=true`
- HTTPS only
- Prefer a reverse proxy so frontend and API share a parent site (`app.example.com` + `/api` or `Domain=.example.com`)
- If truly cross-site, use `COOKIE_SAMESITE=none` and keep CSRF origin checks

## Security checklist

### Frontend

- [ ] No tokens in localStorage
- [ ] `credentials: "include"` only to the API
- [ ] UI permission checks are cosmetic

### Backend

- [ ] Argon2 password hashes
- [ ] HTTP-only cookies
- [ ] Helmet, CORS allowlist, rate limits
- [ ] Joi validation on every write
- [ ] Session / reset / verify expirations
- [ ] Origin + `X-Requested-With` on mutating requests
- [ ] Login lockout
- [ ] Audit on sensitive writes

### Database

- [ ] Network-restricted MongoDB
- [ ] Least-privilege user
- [ ] Token hashes only

### Deployment

- [ ] Secrets in a secret manager
- [ ] `GET /health` does not leak internals
- [ ] Log redaction enabled

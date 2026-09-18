# Authentication

Selected design: **HTTP-only cookies + MongoDB session documents**.

Rejected: JWT in `localStorage`, stateless JWT-only (cannot revoke).

## Cookies

| Cookie | Role | TTL |
|---|---|---|
| `sid` (configurable `COOKIE_NAME`) | Access token | `ACCESS_TTL_MINUTES` (default 15) |
| `rid` (configurable `REFRESH_COOKIE_NAME`) | Refresh token | `SESSION_TTL_HOURS` (default 168) |

Flags: `httpOnly`, `path=/`, `secure` in production, `sameSite=lax` when first-party. Only SHA-256 hashes are stored.

## Flows

- Signup creates `pending_verification` and emails a hashed token (24h).
- Verify sets `active`, creates a session, sets both cookies.
- Login checks lockout, password, and status, then creates a session.
- Access expiry returns 401. The client calls `POST /auth/refresh`; a valid refresh token rotates both tokens.
- Invalid or expired refresh token clears both cookies. The client redirects to `/login`.
- Logout deletes the current session and clears both cookies.
- Password change and reset delete all sessions for that user.
- Idle timeout uses `lastSeenAt` (`IDLE_TTL_HOURS`).

## CSRF

Mutating requests require:

- `X-Requested-With: XMLHttpRequest`
- `Origin` or `Referer` on the CORS allowlist

The frontend API client always sends the custom header and `credentials: "include"`.

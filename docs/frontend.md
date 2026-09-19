# Frontend

Next.js App Router UI for Nesmee EOS. JavaScript only, Tailwind CSS.

## Folders

- `app/` — routes, layouts, loading, error, not-found
- `components/ui` — design-system primitives
- `components/layout` — Navbar, AppShell, Sidebar, Header
- `components/marketing` — homepage sections
- `services/` — one function per API use case
- `lib/api` — central fetch client
- `contexts/` — auth and toasts
- `config/nav.js` — navigation entries filtered by permission

## Route groups

- `(public)` — marketing `/`
- `(auth)` — login, signup, forgot/reset/verify
- `(app)` — dashboard and admin

`middleware.js` checks for `sid` or `rid`. `apiClient` calls `POST /auth/refresh` on 401; if the refresh token is valid it retries the request, otherwise it redirects to `/login`. `AuthProvider` calls `GET /auth/me` on load.

## API

Components call services. Services call `apiClient`. Never call `fetch` from a page.

Development rewrite: `/api/:path*` → `http://localhost:5000/api/:path*`.

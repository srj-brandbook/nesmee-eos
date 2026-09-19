# Architecture

Nesmee EOS is an export operating system: sourcing, markets, corridors, documents, and billing behind one permission-aware workspace.

```
Browser → Next.js frontend → Express REST API → Service layer → Mongoose → MongoDB
```

## Responsibilities

| Layer | Responsibility |
|---|---|
| Browser | Renders UI. Does not store access tokens. |
| Next.js | Routing, marketing SSR, app shell, permission-aware UI, API client. |
| Express | HTTP, cookies, validation, RBAC, versioning. |
| Services | Business rules, email, audit. No `req`/`res`. |
| Mongoose | Schemas and indexes. |
| MongoDB | Source of truth. |

Frontend and backend are independently deployable. Next.js never talks to MongoDB.

## Auth

Server-side sessions in MongoDB. Opaque access (`sid`) and refresh (`rid`) tokens in HTTP-only cookies.

## Adding features

Follow [adding-module.md](adding-module.md). Do not fork auth, `apiClient`, AppShell, or RBAC.

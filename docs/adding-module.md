# Adding a module

Example: **Projects**. Do not modify auth, `apiClient`, AppShell, or RBAC internals.

1. **Database** — design the collection. Prefer refs to User. Add indexes.
2. **Model** — `backend/src/models/Project.js`
3. **Validator** — `backend/src/modules/projects/project.validator.js` (Joi)
4. **Service** — business rules, pagination, `auditService.log`, optional `notificationService.create`
5. **Controller** — parse req, call service, `success(res, { ... })`
6. **Route** — `authenticate`, `requirePermission('projects.view')`, `validate(...)`
7. **Mount** — `app.use("/api/v1/projects", projectRoutes)` in `src/app.js`
8. **Permission** — add `projects.view|create|update|delete` to `backend/src/constants/permissions.js` and re-run `npm run seed`
9. **API service** — `frontend/services/projectService.js` using `apiClient`
10. **Page** — `frontend/app/(app)/projects/page.js` plus feature components
11. **UI** — reuse Table, Form primitives, EmptyState
12. **Navigation** — one entry in `frontend/config/nav.js` with `permission: "projects.view"`
13. **Constants** — add names to `frontend/constants/permissions.js`

That is the entire path. Future products (CRM, billing, files) use the same sequence.

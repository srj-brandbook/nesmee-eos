# Authorization

```
User → Role(s) → Permissions
```

Effective permissions are the union of all assigned roles. Super Admin roles bypass permission checks and are still audited.

## Check order (API)

1. Authenticated session
2. Account not disabled
3. Super Admin bypass
4. Required permission
5. Resource rule in the service (self vs others, last Super Admin)

## UI

`useAuth().can('users.delete')` and `<Can permission="...">` hide actions only. Never treat the UI as security.

## V1 catalog

`users.*`, `roles.*`, `permissions.view`, `settings.view|update`, `audit.view`, `leads.*` (including `leads.convert`), `activities.*`, `calendar.view`.

Do not hard-code role names in components. Add new permission strings through the seed catalog.

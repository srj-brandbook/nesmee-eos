export function can(permissions = [], permission) {
  if (!permission) return true;
  return permissions.includes(permission);
}

export function requirePermission(permissions, permission) {
  return can(permissions, permission);
}

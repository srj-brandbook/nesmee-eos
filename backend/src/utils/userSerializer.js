function serializeUser(user) {
  if (!user) return null;
  const source = typeof user.toObject === "function" ? user.toObject() : user;
  return {
    id: String(source._id || source.id),
    name: source.name,
    email: source.email,
    avatarUrl: source.avatarUrl || "",
    avatarPublicId: source.avatarPublicId || "",
    status: source.status,
    roleIds: (source.roleIds || []).map((id) => String(id._id || id)),
    roles: Array.isArray(source.roles)
      ? source.roles
      : (source.roleIds || [])
          .filter((role) => role && role.name)
          .map((role) => ({
            id: String(role._id),
            name: role.name,
            slug: role.slug,
            isSuperAdmin: Boolean(role.isSuperAdmin),
          })),
    permissions: source.permissions || [],
    emailVerifiedAt: source.emailVerifiedAt || null,
    lastLoginAt: source.lastLoginAt || null,
    notifyInApp: source.notifyInApp !== false,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeSession(session, currentSessionId) {
  return {
    id: String(session._id),
    userAgent: session.userAgent,
    ip: session.ip,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    current: currentSessionId ? String(session._id) === String(currentSessionId) : false,
  };
}

module.exports = { serializeUser, serializeSession };

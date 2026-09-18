const Permission = require("../../models/Permission");

async function resolveAccess(user) {
  const roles = (user.roleIds || []).filter(Boolean);
  const isSuperAdmin = roles.some((role) => role.isSuperAdmin && !role.deletedAt);
  const permissionIds = [
    ...new Set(
      roles
        .filter((role) => !role.deletedAt)
        .flatMap((role) => (role.permissionIds || []).map((id) => String(id)))
    ),
  ];

  const permissions = permissionIds.length
    ? await Permission.find({ _id: { $in: permissionIds } }).lean()
    : [];

  return {
    isSuperAdmin,
    roles: roles
      .filter((role) => !role.deletedAt)
      .map((role) => ({
        id: String(role._id),
        name: role.name,
        slug: role.slug,
        isSuperAdmin: Boolean(role.isSuperAdmin),
      })),
    permissions: permissions.map((permission) => permission.name),
  };
}

module.exports = { resolveAccess };

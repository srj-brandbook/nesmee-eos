const Role = require("../../models/Role");
const Permission = require("../../models/Permission");
const User = require("../../models/User");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta } = require("../../utils/pagination");
const auditService = require("../audit/audit.service");

function serializeRole(role, userCount = 0) {
  return {
    id: String(role._id),
    name: role.name,
    slug: role.slug,
    description: role.description,
    isSystem: Boolean(role.isSystem),
    isSuperAdmin: Boolean(role.isSuperAdmin),
    permissionIds: (role.permissionIds || []).map((item) => String(item._id || item)),
    permissions: (role.permissionIds || [])
      .filter((item) => item && item.name)
      .map((item) => ({
        id: String(item._id),
        name: item.name,
        module: item.module,
        action: item.action,
      })),
    userCount,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function list(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = { deletedAt: null };
  const [items, total] = await Promise.all([
    Role.find(filter).populate("permissionIds").sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Role.countDocuments(filter),
  ]);
  const counts = await User.aggregate([
    { $match: { deletedAt: null } },
    { $unwind: "$roleIds" },
    { $group: { _id: "$roleIds", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((row) => [String(row._id), row.count]));
  return {
    items: items.map((item) => serializeRole(item, countMap[String(item._id)] || 0)),
    pagination: paginationMeta({ page, limit, total }),
  };
}

async function getById(id) {
  const role = await Role.findOne({ _id: id, deletedAt: null }).populate("permissionIds").lean();
  if (!role) throw ApiError.notFound("Role not found");
  const userCount = await User.countDocuments({ deletedAt: null, roleIds: role._id });
  const users = await User.find({ deletedAt: null, roleIds: role._id }).select("name email status").lean();
  return {
    role: serializeRole(role, userCount),
    users: users.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      status: user.status,
    })),
  };
}

async function create(payload, actor, req) {
  const slug = payload.slug || slugify(payload.name);
  const existing = await Role.findOne({ slug, deletedAt: null });
  if (existing) throw ApiError.conflict("Role slug already exists", { slug: "Slug already exists" });
  if (payload.permissionIds?.length) {
    const count = await Permission.countDocuments({ _id: { $in: payload.permissionIds } });
    if (count !== payload.permissionIds.length) {
      throw ApiError.validation({ permissionIds: "One or more permissions are invalid" });
    }
  }
  const role = await Role.create({
    name: payload.name,
    slug,
    description: payload.description || "",
    permissionIds: payload.permissionIds || [],
  });
  await auditService.log({
    actor,
    action: "create",
    module: "roles",
    resourceType: "Role",
    resourceId: role._id,
    req,
  });
  return getById(role._id);
}

async function update(id, payload, actor, req) {
  const role = await Role.findOne({ _id: id, deletedAt: null });
  if (!role) throw ApiError.notFound("Role not found");
  if (role.isSystem && payload.slug) {
    throw ApiError.forbidden("System role slug cannot be changed");
  }
  if (payload.name) role.name = payload.name;
  if (payload.description !== undefined) role.description = payload.description;
  if (payload.permissionIds) {
    const count = await Permission.countDocuments({ _id: { $in: payload.permissionIds } });
    if (count !== payload.permissionIds.length) {
      throw ApiError.validation({ permissionIds: "One or more permissions are invalid" });
    }
    role.permissionIds = payload.permissionIds;
  }
  await role.save();
  await auditService.log({
    actor,
    action: "update",
    module: "roles",
    resourceType: "Role",
    resourceId: role._id,
    req,
  });
  return getById(role._id);
}

async function setPermissions(id, permissionIds, actor, req) {
  return update(id, { permissionIds }, actor, req);
}

async function remove(id, actor, req) {
  const role = await Role.findOne({ _id: id, deletedAt: null });
  if (!role) throw ApiError.notFound("Role not found");
  if (role.isSystem) throw ApiError.forbidden("System roles cannot be deleted");
  const assigned = await User.countDocuments({ deletedAt: null, roleIds: role._id });
  if (assigned > 0) throw ApiError.conflict("Reassign users before deleting this role");
  role.deletedAt = new Date();
  await role.save();
  await auditService.log({
    actor,
    action: "delete",
    module: "roles",
    resourceType: "Role",
    resourceId: role._id,
    req,
  });
}

module.exports = { list, getById, create, update, setPermissions, remove };

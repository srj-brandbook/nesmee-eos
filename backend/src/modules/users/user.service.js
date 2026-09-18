const User = require("../../models/User");
const Role = require("../../models/Role");
const Session = require("../../models/Session");
const ApiError = require("../../utils/ApiError");
const { hashPassword } = require("../../utils/hash");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializeUser } = require("../../utils/userSerializer");
const { sendPasswordResetEmail } = require("../../utils/mailer");
const { createOpaqueToken, addMinutes } = require("../../utils/tokens");
const env = require("../../config/env");
const PasswordResetToken = require("../../models/PasswordResetToken");
const auditService = require("../audit/audit.service");
const notificationService = require("../notifications/notification.service");
const uploadService = require("../uploads/upload.service");

function notDeleted(extra = {}) {
  return { deletedAt: null, ...extra };
}

async function ensureRolesExist(roleIds = []) {
  if (!roleIds.length) return [];
  const roles = await Role.find({ _id: { $in: roleIds }, deletedAt: null });
  if (roles.length !== roleIds.length) throw ApiError.validation({ roleIds: "One or more roles are invalid" });
  return roles;
}

async function lastSuperAdminGuard(userId) {
  const superRoles = await Role.find({ isSuperAdmin: true, deletedAt: null }).select("_id");
  const superRoleIds = superRoles.map((role) => role._id);
  const remaining = await User.countDocuments(
    notDeleted({
      _id: { $ne: userId },
      roleIds: { $in: superRoleIds },
      status: { $ne: "disabled" },
    })
  );
  return remaining;
}

async function list(query) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "name", "email", "status"]);
  const filter = notDeleted();
  if (query.status) filter.status = query.status;
  if (query.roleId) filter.roleIds = query.roleId;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter).populate("roleIds").sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return {
    items: items.map((item) => serializeUser(item)),
    pagination: paginationMeta({ page, limit, total }),
  };
}

async function getById(id) {
  const user = await User.findOne(notDeleted({ _id: id })).populate("roleIds").lean();
  if (!user) throw ApiError.notFound("User not found");
  return serializeUser(user);
}

async function create(payload, actor, req) {
  const existing = await User.findOne(notDeleted({ email: payload.email.toLowerCase() }));
  if (existing) throw ApiError.conflict("Email already in use", { email: "Email already in use" });
  const roles = await ensureRolesExist(payload.roleIds || []);

  const user = await User.create({
    name: payload.name,
    email: payload.email.toLowerCase(),
    passwordHash: await hashPassword(payload.password),
    status: payload.status || "active",
    roleIds: roles.map((role) => role._id),
    emailVerifiedAt: payload.status === "pending_verification" ? null : new Date(),
    avatarUrl: payload.avatarUrl || "",
    avatarPublicId: payload.avatarPublicId || "",
  });

  await auditService.log({
    actor,
    action: "create",
    module: "users",
    resourceType: "User",
    resourceId: user._id,
    req,
  });
  await notificationService.create({
    userId: user._id,
    type: "account",
    title: "Account created",
    body: "An administrator created your account.",
  });

  return getById(user._id);
}

async function update(id, payload, actor, req) {
  const user = await User.findOne(notDeleted({ _id: id }));
  if (!user) throw ApiError.notFound("User not found");

  if (payload.roleIds) {
    const roles = await ensureRolesExist(payload.roleIds);
    const stillSuper = roles.some((role) => role.isSuperAdmin);
    if (!stillSuper && (await lastSuperAdminGuard(user._id)) === 0) {
      throw ApiError.forbidden("Cannot remove the last Super Admin");
    }
    user.roleIds = roles.map((role) => role._id);
    await notificationService.create({
      userId: user._id,
      type: "roles",
      title: "Roles updated",
      body: "Your roles or permissions may have changed.",
    });
  }

  if (payload.name) user.name = payload.name;
  if (payload.avatarUrl !== undefined || payload.avatarPublicId !== undefined) {
    const nextPublicId = payload.avatarPublicId !== undefined ? payload.avatarPublicId : user.avatarPublicId;
    await uploadService.discardPrevious(user.avatarPublicId, nextPublicId, "image");
    if (payload.avatarUrl !== undefined) user.avatarUrl = payload.avatarUrl;
    if (payload.avatarPublicId !== undefined) user.avatarPublicId = payload.avatarPublicId;
  }
  if (payload.status && payload.status !== user.status) {
    if (String(actor._id) === String(user._id) && payload.status === "disabled") {
      throw ApiError.forbidden("You cannot disable your own account");
    }
    user.status = payload.status;
    if (payload.status === "disabled") {
      if ((await lastSuperAdminGuard(user._id)) === 0) {
        throw ApiError.forbidden("Cannot disable the last Super Admin");
      }
      await Session.deleteMany({ userId: user._id });
    }
  }

  await user.save();
  await auditService.log({
    actor,
    action: "update",
    module: "users",
    resourceType: "User",
    resourceId: user._id,
    req,
    metadata: { fields: Object.keys(payload) },
  });
  return getById(user._id);
}

async function remove(id, actor, req) {
  if (String(actor._id) === String(id)) throw ApiError.forbidden("You cannot delete your own account");
  const user = await User.findOne(notDeleted({ _id: id }));
  if (!user) throw ApiError.notFound("User not found");
  if ((await lastSuperAdminGuard(user._id)) === 0) {
    throw ApiError.forbidden("Cannot delete the last Super Admin");
  }
  user.deletedAt = new Date();
  user.email = `deleted+${user._id}@deleted.local`;
  await user.save();
  await Session.deleteMany({ userId: user._id });
  await auditService.log({
    actor,
    action: "delete",
    module: "users",
    resourceType: "User",
    resourceId: user._id,
    req,
  });
}

async function setActive(id, active, actor, req) {
  return update(id, { status: active ? "active" : "disabled" }, actor, req);
}

async function sendReset(id, actor, req) {
  const user = await User.findOne(notDeleted({ _id: id }));
  if (!user) throw ApiError.notFound("User not found");
  const token = createOpaqueToken();
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: token.hash,
    expiresAt: addMinutes(new Date(), env.PASSWORD_RESET_TTL_MINUTES),
  });
  await sendPasswordResetEmail({ to: user.email, name: user.name, token: token.raw });
  await auditService.log({
    actor,
    action: "admin_reset_password",
    module: "users",
    resourceType: "User",
    resourceId: user._id,
    req,
  });
}

module.exports = { list, getById, create, update, remove, setActive, sendReset };

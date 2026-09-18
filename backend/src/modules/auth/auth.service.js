const env = require("../../config/env");
const User = require("../../models/User");
const Session = require("../../models/Session");
const Role = require("../../models/Role");
const Settings = require("../../models/Settings");
const EmailVerificationToken = require("../../models/EmailVerificationToken");
const PasswordResetToken = require("../../models/PasswordResetToken");
const ApiError = require("../../utils/ApiError");
const { hashPassword, verifyPassword, hashToken } = require("../../utils/hash");
const { createOpaqueToken, addHours, addMinutes } = require("../../utils/tokens");
const { serializeUser } = require("../../utils/userSerializer");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../../utils/mailer");
const { resolveAccess } = require("./auth.access");
const auditService = require("../audit/audit.service");
const notificationService = require("../notifications/notification.service");

function clientMeta(req) {
  return {
    ip: req?.ip || "",
    userAgent: req?.get?.("user-agent") || "",
  };
}

async function getSettings() {
  return Settings.findOneAndUpdate(
    { key: "app" },
    { $setOnInsert: { key: "app" } },
    { upsert: true, new: true }
  );
}

function isIdle(session) {
  const idleMs = env.IDLE_TTL_HOURS * 60 * 60 * 1000;
  return Date.now() - new Date(session.lastSeenAt).getTime() > idleMs;
}

async function assertRefreshableSession(session) {
  if (!session) throw ApiError.unauthorized("Session expired");
  if (session.expiresAt <= new Date() || isIdle(session)) {
    await session.deleteOne();
    throw ApiError.unauthorized("Session expired");
  }
}

async function loadSessionUser(session) {
  const user = await User.findOne({ _id: session.userId, deletedAt: null }).populate("roleIds");
  if (!user) {
    await session.deleteOne();
    throw ApiError.unauthorized("Session expired");
  }
  if (user.status === "disabled") {
    await Session.deleteMany({ userId: user._id });
    throw ApiError.forbidden("Account is disabled");
  }
  return user;
}

function applyRotatedTokens(session, req) {
  const access = createOpaqueToken();
  const refresh = createOpaqueToken();
  const now = new Date();
  session.tokenHash = access.hash;
  session.refreshTokenHash = refresh.hash;
  session.accessExpiresAt = addMinutes(now, env.ACCESS_TTL_MINUTES);
  session.lastSeenAt = now;
  session.userAgent = clientMeta(req).userAgent;
  session.ip = clientMeta(req).ip;
  return { access, refresh };
}

async function createSession(user, req) {
  const access = createOpaqueToken();
  const refresh = createOpaqueToken();
  const now = new Date();
  const session = await Session.create({
    userId: user._id,
    tokenHash: access.hash,
    refreshTokenHash: refresh.hash,
    userAgent: clientMeta(req).userAgent,
    ip: clientMeta(req).ip,
    expiresAt: addHours(now, env.SESSION_TTL_HOURS),
    accessExpiresAt: addMinutes(now, env.ACCESS_TTL_MINUTES),
    lastSeenAt: now,
  });
  return { session, rawToken: access.raw, rawRefreshToken: refresh.raw };
}

async function refreshSession(rawRefreshToken, req) {
  if (!rawRefreshToken) throw ApiError.unauthorized("Session expired");

  const session = await Session.findOne({ refreshTokenHash: hashToken(rawRefreshToken) });
  await assertRefreshableSession(session);
  const user = await loadSessionUser(session);

  const { access, refresh } = applyRotatedTokens(session, req);
  await session.save();

  return {
    user: await buildCurrentUser(user),
    rawToken: access.raw,
    rawRefreshToken: refresh.raw,
  };
}

async function buildCurrentUser(user) {
  const populated = await User.findById(user._id).populate("roleIds");
  const access = await resolveAccess(populated);
  return serializeUser({
    ...populated.toObject(),
    roles: access.roles,
    permissions: access.permissions,
  });
}

async function issueVerification(user) {
  await EmailVerificationToken.deleteMany({ userId: user._id, usedAt: null });
  const token = createOpaqueToken();
  await EmailVerificationToken.create({
    userId: user._id,
    tokenHash: token.hash,
    expiresAt: addHours(new Date(), env.EMAIL_VERIFY_TTL_HOURS),
  });
  await sendVerificationEmail({ to: user.email, name: user.name, token: token.raw });
}

async function signup({ name, email, password }, req) {
  const settings = await getSettings();
  if (!settings.signupEnabled) {
    throw ApiError.forbidden("Signup is currently disabled");
  }

  const existing = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (existing) throw ApiError.conflict("Email already in use", { email: "Email already in use" });

  const memberRole = await Role.findOne({ slug: "member", deletedAt: null });
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    status: "pending_verification",
    roleIds: memberRole ? [memberRole._id] : [],
  });

  await issueVerification(user);
  await auditService.log({
    actor: user,
    action: "signup",
    module: "auth",
    resourceType: "User",
    resourceId: user._id,
    req,
  });
  await notificationService.create({
    userId: user._id,
    type: "welcome",
    title: "Welcome",
    body: "Verify your email to start using the dashboard.",
  });

  return { user: serializeUser(user) };
}

async function login({ email, password }, req) {
  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null }).select("+passwordHash");
  if (!user) {
    await auditService.log({ action: "login_failed", module: "auth", req, metadata: { email } });
    throw ApiError.unauthorized("Invalid email or password");
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    throw ApiError.rateLimited("Account is temporarily locked. Try again later.");
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    user.failedLoginCount += 1;
    if (user.failedLoginCount >= env.LOGIN_MAX_ATTEMPTS) {
      user.lockUntil = addMinutes(new Date(), env.LOGIN_LOCK_MINUTES);
      user.failedLoginCount = 0;
    }
    await user.save();
    await auditService.log({
      actor: user,
      action: "login_failed",
      module: "auth",
      resourceType: "User",
      resourceId: user._id,
      req,
    });
    throw ApiError.unauthorized("Invalid email or password");
  }

  if (user.status === "disabled") throw ApiError.forbidden("Account is disabled");

  user.failedLoginCount = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  const { session, rawToken, rawRefreshToken } = await createSession(user, req);
  await auditService.log({
    actor: user,
    action: "login",
    module: "auth",
    resourceType: "Session",
    resourceId: session._id,
    req,
  });

  return { user: await buildCurrentUser(user), rawToken, rawRefreshToken };
}

async function logout(sessionId) {
  if (sessionId) await Session.deleteOne({ _id: sessionId });
}

async function me(user) {
  return buildCurrentUser(user);
}

async function verifyEmail(token, req) {
  const record = await EmailVerificationToken.findOne({ tokenHash: hashToken(token), usedAt: null });
  if (!record || record.expiresAt <= new Date()) {
    throw ApiError.badRequest("Verification link is invalid or expired");
  }

  const user = await User.findOne({ _id: record.userId, deletedAt: null });
  if (!user) throw ApiError.badRequest("Verification link is invalid or expired");

  user.status = "active";
  user.emailVerifiedAt = new Date();
  await user.save();
  record.usedAt = new Date();
  await record.save();

  await auditService.log({
    actor: user,
    action: "verify_email",
    module: "auth",
    resourceType: "User",
    resourceId: user._id,
    req,
  });

  const { session, rawToken, rawRefreshToken } = await createSession(user, req);
  return { user: await buildCurrentUser(user), rawToken, rawRefreshToken, session };
}

async function resendVerification(email) {
  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (user && user.status === "pending_verification") {
    await issueVerification(user);
  }
}

async function forgotPassword(email, req) {
  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (user) {
    await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });
    const token = createOpaqueToken();
    await PasswordResetToken.create({
      userId: user._id,
      tokenHash: token.hash,
      expiresAt: addMinutes(new Date(), env.PASSWORD_RESET_TTL_MINUTES),
    });
    await sendPasswordResetEmail({ to: user.email, name: user.name, token: token.raw });
    await auditService.log({
      actor: user,
      action: "forgot_password",
      module: "auth",
      resourceType: "User",
      resourceId: user._id,
      req,
    });
  }
}

async function resetPassword({ token, password }, req) {
  const record = await PasswordResetToken.findOne({ tokenHash: hashToken(token), usedAt: null });
  if (!record || record.expiresAt <= new Date()) {
    throw ApiError.badRequest("Reset link is invalid or expired");
  }
  const user = await User.findOne({ _id: record.userId, deletedAt: null });
  if (!user) throw ApiError.badRequest("Reset link is invalid or expired");

  user.passwordHash = await hashPassword(password);
  user.failedLoginCount = 0;
  user.lockUntil = null;
  await user.save();
  record.usedAt = new Date();
  await record.save();
  await Session.deleteMany({ userId: user._id });

  await auditService.log({
    actor: user,
    action: "reset_password",
    module: "auth",
    resourceType: "User",
    resourceId: user._id,
    req,
  });
}

async function changePassword(user, { currentPassword, newPassword }, req) {
  const fresh = await User.findById(user._id).select("+passwordHash");
  const valid = await verifyPassword(fresh.passwordHash, currentPassword);
  if (!valid) throw ApiError.validation({ currentPassword: "Current password is incorrect" });

  fresh.passwordHash = await hashPassword(newPassword);
  await fresh.save();
  await Session.deleteMany({ userId: fresh._id });

  await auditService.log({
    actor: fresh,
    action: "change_password",
    module: "auth",
    resourceType: "User",
    resourceId: fresh._id,
    req,
  });

  const { session, rawToken, rawRefreshToken } = await createSession(fresh, req);
  return { rawToken, rawRefreshToken, session };
}

module.exports = {
  signup,
  login,
  logout,
  me,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshSession,
  createSession,
  getSettings,
  isIdle,
  loadSessionUser,
};

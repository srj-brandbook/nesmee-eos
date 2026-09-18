const env = require("../config/env");
const Session = require("../models/Session");
const ApiError = require("../utils/ApiError");
const { hashToken } = require("../utils/hash");
const { resolveAccess } = require("../modules/auth/auth.access");
const { clearAuthCookies } = require("../config/cookie");
const { isIdle, loadSessionUser } = require("../modules/auth/auth.service");

async function expireSession(session, res) {
  if (session) await session.deleteOne();
  clearAuthCookies(res);
  throw ApiError.unauthorized("Session expired");
}

async function authenticate(req, res, next) {
  try {
    const raw = req.cookies?.[env.COOKIE_NAME];
    if (!raw) throw ApiError.unauthorized();

    const session = await Session.findOne({ tokenHash: hashToken(raw) });
    if (!session) throw ApiError.unauthorized("Session expired");

    if (session.expiresAt <= new Date() || isIdle(session)) {
      await expireSession(session, res);
    }

    if (session.accessExpiresAt && session.accessExpiresAt <= new Date()) {
      throw ApiError.unauthorized("Session expired");
    }

    let user;
    try {
      user = await loadSessionUser(session);
    } catch (error) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        clearAuthCookies(res);
      }
      throw error;
    }

    session.lastSeenAt = new Date();
    await session.save();

    const access = await resolveAccess(user);
    req.user = user;
    req.sessionDoc = session;
    req.permissions = access.permissions;
    req.isSuperAdmin = access.isSuperAdmin;

    if (!req.isSuperAdmin) {
      const Settings = require("../models/Settings");
      const settings = await Settings.findOne({ key: "app" }).lean();
      if (settings?.maintenanceMode && !req.path.startsWith("/api/v1/auth")) {
        throw ApiError.maintenance();
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

function optionalAuthenticate(req, res, next) {
  const raw = req.cookies?.[env.COOKIE_NAME];
  if (!raw) return next();
  return authenticate(req, res, next);
}

module.exports = { authenticate, optionalAuthenticate };

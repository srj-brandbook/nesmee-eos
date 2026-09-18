const ApiError = require("../utils/ApiError");

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.user.status === "pending_verification") {
      return next(ApiError.forbidden("Email verification required"));
    }
    if (req.isSuperAdmin) return next();
    if (!req.permissions?.includes(permission)) {
      return next(ApiError.forbidden());
    }
    return next();
  };
}

function requireVerified(req, res, next) {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.status === "pending_verification") {
    return next(ApiError.forbidden("Email verification required"));
  }
  return next();
}

module.exports = { requirePermission, requireVerified };

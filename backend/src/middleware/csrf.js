const { parseOrigins } = require("../config/cors");
const ApiError = require("../utils/ApiError");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const header = req.get("x-requested-with");
  if (header !== "XMLHttpRequest") {
    return next(ApiError.forbidden("Missing CSRF header"));
  }

  const origin = req.get("origin");
  const referer = req.get("referer");
  const allowlist = parseOrigins();

  if (origin) {
    if (!allowlist.includes(origin)) {
      return next(ApiError.forbidden("Invalid origin"));
    }
    return next();
  }

  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (!allowlist.includes(refererOrigin)) {
        return next(ApiError.forbidden("Invalid referer"));
      }
      return next();
    } catch {
      return next(ApiError.forbidden("Invalid referer"));
    }
  }

  if (process.env.NODE_ENV === "test") return next();
  return next(ApiError.forbidden("Missing origin"));
}

module.exports = csrfProtection;

const Settings = require("../models/Settings");
const ApiError = require("../utils/ApiError");

const OPEN_PATHS = new Set(["/health", "/api/v1/auth/login", "/api/v1/auth/forgot-password", "/api/v1/auth/reset-password"]);

async function maintenance(req, res, next) {
  try {
    if (OPEN_PATHS.has(req.path)) return next();
    const settings = await Settings.findOne({ key: "app" }).lean();
    if (!settings?.maintenanceMode) return next();
    if (req.isSuperAdmin) return next();
    if (req.path.startsWith("/api/v1/auth/login")) return next();
    return next(ApiError.maintenance());
  } catch (error) {
    return next(error);
  }
}

module.exports = maintenance;

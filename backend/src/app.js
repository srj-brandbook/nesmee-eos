const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const pinoHttp = require("pino-http");
const env = require("./config/env");
const logger = require("./config/logger");
const { corsOptions } = require("./config/cors");
const requestId = require("./middleware/requestId");
const csrfProtection = require("./middleware/csrf");
const { globalLimiter } = require("./middleware/rateLimit");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/users/user.routes");
const roleRoutes = require("./modules/roles/role.routes");
const permissionRoutes = require("./modules/permissions/permission.routes");
const notificationRoutes = require("./modules/notifications/notification.routes");
const profileRoutes = require("./modules/profile/profile.routes");
const settingsRoutes = require("./modules/settings/settings.routes");
const sessionRoutes = require("./modules/sessions/session.routes");
const auditRoutes = require("./modules/audit/audit.routes");
const leadRoutes = require("./modules/leads/lead.routes");
const activityRoutes = require("./modules/activities/activity.routes");
const calendarRoutes = require("./modules/calendar/calendar.routes");
const formRoutes = require("./modules/forms/form.routes");
const exportRoutes = require("./modules/export/export.routes");
const uploadRoutes = require("./modules/uploads/upload.routes");
const verificationRoutes = require("./modules/verification/verification.routes");
const billingRoutes = require("./modules/billing/billing.routes");
const documentRoutes = require("./modules/documents/document.routes");
const productRoutes = require("./modules/products/product.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");

function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.requestId,
      customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
    })
  );
  app.use(helmet());
  app.use(compression());
  app.use(cors(corsOptions()));
  app.use("/api/v1/documents", express.json({ limit: "8mb" }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(globalLimiter);
  app.use(csrfProtection);

  app.get("/health", (req, res) => {
    res.json({
      success: true,
      message: "OK",
      data: { status: "ok", uptime: process.uptime() },
    });
  });

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/roles", roleRoutes);
  app.use("/api/v1/permissions", permissionRoutes);
  app.use("/api/v1/notifications", notificationRoutes);
  app.use("/api/v1/profile", profileRoutes);
  app.use("/api/v1/settings", settingsRoutes);
  app.use("/api/v1/sessions", sessionRoutes);
  app.use("/api/v1/audit-logs", auditRoutes);
  app.use("/api/v1/leads", leadRoutes);
  app.use("/api/v1/activities", activityRoutes);
  app.use("/api/v1/calendar", calendarRoutes);
  app.use("/api/v1/forms", formRoutes);
  app.use("/api/v1/export", exportRoutes);
  app.use("/api/v1/uploads", uploadRoutes);
  app.use("/api/v1/verification", verificationRoutes);
  app.use("/api/v1/billing", billingRoutes);
  app.use("/api/v1/documents", documentRoutes);
  app.use("/api/v1/products", productRoutes);
  app.use("/api/v1/dashboard", dashboardRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };

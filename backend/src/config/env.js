const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function bool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes"].includes(String(raw).toLowerCase());
}

function integer(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer`);
  }
  return parsed;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: integer("PORT", 5000),
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  MONGO_URI: required("MONGO_URI", "mongodb://127.0.0.1:27017/saas_boilerplate"),
  CORS_ORIGIN: required("CORS_ORIGIN", "http://localhost:3000"),
  APP_URL: required("APP_URL", "http://localhost:3000"),
  COOKIE_NAME: process.env.COOKIE_NAME || "sid",
  REFRESH_COOKIE_NAME: process.env.REFRESH_COOKIE_NAME || "rid",
  COOKIE_SECRET: required("COOKIE_SECRET", "dev-only-change-me"),
  COOKIE_SECURE: bool("COOKIE_SECURE", false),
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE || "lax",
  ACCESS_TTL_MINUTES: integer("ACCESS_TTL_MINUTES", 15),
  SESSION_TTL_HOURS: integer("SESSION_TTL_HOURS", 168),
  IDLE_TTL_HOURS: integer("IDLE_TTL_HOURS", 12),
  PASSWORD_RESET_TTL_MINUTES: integer("PASSWORD_RESET_TTL_MINUTES", 60),
  EMAIL_VERIFY_TTL_HOURS: integer("EMAIL_VERIFY_TTL_HOURS", 24),
  LOGIN_MAX_ATTEMPTS: integer("LOGIN_MAX_ATTEMPTS", 5),
  LOGIN_LOCK_MINUTES: integer("LOGIN_LOCK_MINUTES", 15),
  SMTP_HOST: process.env.SMTP_HOST || "127.0.0.1",
  SMTP_PORT: integer("SMTP_PORT", 1025),
  SMTP_SECURE: bool("SMTP_SECURE", false),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM: process.env.SMTP_FROM || "SaaS Boilerplate <noreply@localhost>",
  SUPERADMIN_EMAIL: process.env.SUPERADMIN_EMAIL || "admin@example.com",
  SUPERADMIN_PASSWORD: process.env.SUPERADMIN_PASSWORD || "ChangeMeNow!23",
  SUPERADMIN_NAME: process.env.SUPERADMIN_NAME || "Super Admin",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
  CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER || "nesmee",
};

env.isProduction = env.NODE_ENV === "production";

module.exports = env;

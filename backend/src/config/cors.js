const env = require("./env");

function parseOrigins() {
  return env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
}

function corsOptions() {
  const allowlist = parseOrigins();

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowlist.includes(origin)) return callback(null, true);
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Requested-With", "X-Request-Id"],
  };
}

module.exports = { corsOptions, parseOrigins };

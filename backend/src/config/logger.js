const pino = require("pino");
const env = require("./env");

const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "password",
      "currentPassword",
      "newPassword",
      "token",
    ],
    remove: true,
  },
  transport: env.isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      },
});

module.exports = logger;

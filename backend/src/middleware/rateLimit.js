const rateLimit = require("express-rate-limit");
const { error } = require("../utils/ApiResponse");

function handler(req, res) {
  return error(res, {
    status: 429,
    message: "Too many requests, please try again later",
    code: "RATE_LIMITED",
  });
}

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

module.exports = { globalLimiter, authLimiter };

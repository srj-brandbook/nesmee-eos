const crypto = require("crypto");

function requestId(req, res, next) {
  const headerId = req.headers["x-request-id"];
  const id = typeof headerId === "string" && headerId.trim() ? headerId.trim() : crypto.randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

module.exports = requestId;

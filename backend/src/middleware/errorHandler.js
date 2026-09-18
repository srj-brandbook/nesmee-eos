const logger = require("../config/logger");
const { error } = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.message === "Origin not allowed by CORS") {
    return error(res, {
      status: 403,
      message: "Origin not allowed",
      code: "FORBIDDEN",
    });
  }

  if (err instanceof ApiError) {
    return error(res, {
      status: err.statusCode,
      message: err.message,
      code: err.code,
      fields: err.fields,
    });
  }

  if (err.name === "CastError") {
    return error(res, { status: 400, message: "Invalid identifier", code: "UNPROCESSABLE" });
  }

  if (err.code === 11000) {
    return error(res, { status: 409, message: "Resource already exists", code: "CONFLICT" });
  }

  logger.error({ err, requestId: req.requestId }, "Unhandled error");
  return error(res, {
    status: 500,
    message: "Internal server error",
    code: "INTERNAL",
  });
}

module.exports = errorHandler;

class ApiError extends Error {
  constructor(statusCode, message, code = "INTERNAL", fields = {}) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }

  static badRequest(message = "Bad request", fields = {}) {
    return new ApiError(400, message, "UNPROCESSABLE", fields);
  }

  static unauthorized(message = "Authentication required") {
    return new ApiError(401, message, "UNAUTHORIZED");
  }

  static forbidden(message = "You do not have permission to perform this action") {
    return new ApiError(403, message, "FORBIDDEN");
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message, "NOT_FOUND");
  }

  static conflict(message = "Resource already exists", fields = {}) {
    return new ApiError(409, message, "CONFLICT", fields);
  }

  static validation(fields = {}, message = "Validation failed") {
    return new ApiError(422, message, "VALIDATION_ERROR", fields);
  }

  static rateLimited(message = "Too many requests") {
    return new ApiError(429, message, "RATE_LIMITED");
  }

  static maintenance(message = "The application is in maintenance mode") {
    return new ApiError(503, message, "MAINTENANCE");
  }
}

module.exports = ApiError;

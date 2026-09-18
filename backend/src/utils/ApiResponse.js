function success(res, { message = "OK", data = null, status = 200 } = {}) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

function error(res, { status = 500, message = "Internal server error", code = "INTERNAL", fields = {} } = {}) {
  return res.status(status).json({
    success: false,
    message,
    error: { code, fields },
  });
}

module.exports = { success, error };

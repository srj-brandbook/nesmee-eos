const env = require("../../config/env");
const { success } = require("../../utils/ApiResponse");
const { setAuthCookies, clearAuthCookies } = require("../../config/cookie");
const authService = require("./auth.service");

async function signup(req, res) {
  const data = await authService.signup(req.body, req);
  return success(res, { message: "Account created. Check your email to verify.", data, status: 201 });
}

async function login(req, res) {
  const { user, rawToken, rawRefreshToken } = await authService.login(req.body, req);
  setAuthCookies(res, { accessToken: rawToken, refreshToken: rawRefreshToken });
  return success(res, { message: "Logged in", data: { user } });
}

async function logout(req, res) {
  await authService.logout(req.sessionDoc?._id);
  clearAuthCookies(res);
  return success(res, { message: "Logged out", data: null });
}

async function me(req, res) {
  const user = await authService.me(req.user);
  return success(res, { message: "OK", data: { user } });
}

async function refresh(req, res) {
  const rawRefreshToken = req.cookies?.[env.REFRESH_COOKIE_NAME];
  try {
    const { user, rawToken, rawRefreshToken: nextRefresh } = await authService.refreshSession(rawRefreshToken, req);
    setAuthCookies(res, { accessToken: rawToken, refreshToken: nextRefresh });
    return success(res, { message: "Token refreshed", data: { user } });
  } catch (error) {
    clearAuthCookies(res);
    throw error;
  }
}

async function verifyEmail(req, res) {
  const { user, rawToken, rawRefreshToken } = await authService.verifyEmail(req.body.token, req);
  setAuthCookies(res, { accessToken: rawToken, refreshToken: rawRefreshToken });
  return success(res, { message: "Email verified", data: { user } });
}

async function resendVerification(req, res) {
  await authService.resendVerification(req.body.email);
  return success(res, { message: "If an account exists, a verification email was sent", data: null });
}

async function forgotPassword(req, res) {
  await authService.forgotPassword(req.body.email, req);
  return success(res, { message: "If an account exists, a reset email was sent", data: null });
}

async function resetPassword(req, res) {
  await authService.resetPassword(req.body, req);
  clearAuthCookies(res);
  return success(res, { message: "Password reset. You can log in now.", data: null });
}

async function changePassword(req, res) {
  const { rawToken, rawRefreshToken } = await authService.changePassword(req.user, req.body, req);
  setAuthCookies(res, { accessToken: rawToken, refreshToken: rawRefreshToken });
  return success(res, { message: "Password changed", data: null });
}

module.exports = {
  signup,
  login,
  logout,
  me,
  refresh,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
};

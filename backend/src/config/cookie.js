const env = require("./env");

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
  };
}

function accessCookieOptions() {
  return {
    ...baseCookieOptions(),
    maxAge: env.ACCESS_TTL_MINUTES * 60 * 1000,
  };
}

function refreshCookieOptions() {
  return {
    ...baseCookieOptions(),
    maxAge: env.SESSION_TTL_HOURS * 60 * 60 * 1000,
  };
}

function clearCookieOptions() {
  return baseCookieOptions();
}

function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie(env.COOKIE_NAME, accessToken, accessCookieOptions());
  res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
}

function clearAuthCookies(res) {
  res.clearCookie(env.COOKIE_NAME, clearCookieOptions());
  res.clearCookie(env.REFRESH_COOKIE_NAME, clearCookieOptions());
}

module.exports = {
  accessCookieOptions,
  refreshCookieOptions,
  sessionCookieOptions: accessCookieOptions,
  clearCookieOptions,
  setAuthCookies,
  clearAuthCookies,
};

const { success } = require("../../utils/ApiResponse");
const sessionService = require("./session.service");

async function list(req, res) {
  const sessions = await sessionService.listForUser(req.user._id, req.sessionDoc?._id);
  return success(res, { message: "Sessions fetched", data: { items: sessions } });
}

async function listForUser(req, res) {
  const sessions = await sessionService.listForUser(req.params.id);
  return success(res, { message: "Sessions fetched", data: { items: sessions } });
}

async function revoke(req, res) {
  await sessionService.revoke(req.params.id, req.user, req, { userId: req.user._id });
  return success(res, { message: "Session revoked", data: null });
}

async function revokeAll(req, res) {
  await sessionService.revokeAll(req.user._id, req.user, req, req.sessionDoc?._id);
  return success(res, { message: "Other sessions signed out", data: null });
}

module.exports = { list, listForUser, revoke, revokeAll };

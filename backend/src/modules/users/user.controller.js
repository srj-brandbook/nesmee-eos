const { success } = require("../../utils/ApiResponse");
const userService = require("./user.service");

async function list(req, res) {
  const data = await userService.list(req.query);
  return success(res, { message: "Users fetched", data });
}

async function create(req, res) {
  const user = await userService.create(req.body, req.user, req);
  return success(res, { message: "User created", data: { user }, status: 201 });
}

async function get(req, res) {
  const user = await userService.getById(req.params.id);
  return success(res, { message: "User fetched", data: { user } });
}

async function update(req, res) {
  const user = await userService.update(req.params.id, req.body, req.user, req);
  return success(res, { message: "User updated", data: { user } });
}

async function remove(req, res) {
  await userService.remove(req.params.id, req.user, req);
  return success(res, { message: "User deleted", data: null });
}

async function deactivate(req, res) {
  const user = await userService.setActive(req.params.id, false, req.user, req);
  return success(res, { message: "User deactivated", data: { user } });
}

async function activate(req, res) {
  const user = await userService.setActive(req.params.id, true, req.user, req);
  return success(res, { message: "User activated", data: { user } });
}

async function resetPassword(req, res) {
  await userService.sendReset(req.params.id, req.user, req);
  return success(res, { message: "Password reset email sent", data: null });
}

module.exports = { list, create, get, update, remove, deactivate, activate, resetPassword };

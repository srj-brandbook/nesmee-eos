const { success } = require("../../utils/ApiResponse");
const roleService = require("./role.service");

async function list(req, res) {
  const data = await roleService.list(req.query);
  return success(res, { message: "Roles fetched", data });
}

async function create(req, res) {
  const data = await roleService.create(req.body, req.user, req);
  return success(res, { message: "Role created", data, status: 201 });
}

async function get(req, res) {
  const data = await roleService.getById(req.params.id);
  return success(res, { message: "Role fetched", data });
}

async function update(req, res) {
  const data = await roleService.update(req.params.id, req.body, req.user, req);
  return success(res, { message: "Role updated", data });
}

async function setPermissions(req, res) {
  const data = await roleService.setPermissions(req.params.id, req.body.permissionIds, req.user, req);
  return success(res, { message: "Permissions assigned", data });
}

async function remove(req, res) {
  await roleService.remove(req.params.id, req.user, req);
  return success(res, { message: "Role deleted", data: null });
}

module.exports = { list, create, get, update, setPermissions, remove };

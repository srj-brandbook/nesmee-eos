const { success } = require("../../utils/ApiResponse");
const permissionService = require("./permission.service");

async function list(req, res) {
  const data = await permissionService.list();
  return success(res, { message: "Permissions fetched", data });
}

module.exports = { list };

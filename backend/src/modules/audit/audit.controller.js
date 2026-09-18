const { success } = require("../../utils/ApiResponse");
const auditService = require("./audit.service");

async function list(req, res) {
  const data = await auditService.list(req.query);
  return success(res, { message: "Audit logs fetched", data });
}

module.exports = { list };

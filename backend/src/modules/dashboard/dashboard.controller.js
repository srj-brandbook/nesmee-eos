const { success } = require("../../utils/ApiResponse");
const dashboardService = require("./dashboard.service");

async function overview(req, res) {
  const data = await dashboardService.overview(req);
  return success(res, { message: "Dashboard fetched", data });
}

module.exports = { overview };

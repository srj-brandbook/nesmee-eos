const { success } = require("../../utils/ApiResponse");
const settingsService = require("./settings.service");

async function get(req, res) {
  const settings = await settingsService.get();
  return success(res, { message: "Settings fetched", data: { settings } });
}

async function update(req, res) {
  const settings = await settingsService.update(req.body, req.user, req);
  return success(res, { message: "Settings updated", data: { settings } });
}

module.exports = { get, update };

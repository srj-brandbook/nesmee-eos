const { success } = require("../../utils/ApiResponse");
const profileService = require("./profile.service");

async function get(req, res) {
  const user = await profileService.get(req.user);
  return success(res, { message: "Profile fetched", data: { user } });
}

async function update(req, res) {
  const user = await profileService.update(req.user, req.body, req);
  return success(res, { message: "Profile updated", data: { user } });
}

module.exports = { get, update };

const { success } = require("../../utils/ApiResponse");
const activityService = require("../activities/activity.service");

async function list(req, res) {
  const data = await activityService.calendar(req.query);
  return success(res, { message: "Calendar fetched", data });
}

module.exports = { list };

const { success } = require("../../utils/ApiResponse");
const activityService = require("./activity.service");

async function list(req, res) {
  const data = await activityService.list(req.query);
  return success(res, { message: "Activities fetched", data });
}

async function create(req, res) {
  const activity = await activityService.create(req.body, req.user, req);
  return success(res, { message: "Activity created", data: { activity }, status: 201 });
}

async function get(req, res) {
  const activity = await activityService.getById(req.params.id);
  return success(res, { message: "Activity fetched", data: { activity } });
}

async function update(req, res) {
  const activity = await activityService.update(req.params.id, req.body, req.user, req);
  return success(res, { message: "Activity updated", data: { activity } });
}

async function remove(req, res) {
  await activityService.remove(req.params.id, req.user, req);
  return success(res, { message: "Activity deleted", data: null });
}

module.exports = { list, create, get, update, remove };

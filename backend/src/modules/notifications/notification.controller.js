const { success } = require("../../utils/ApiResponse");
const notificationService = require("./notification.service");

async function list(req, res) {
  const data = await notificationService.listForUser(req.user._id, req.query);
  return success(res, { message: "Notifications fetched", data });
}

async function markRead(req, res) {
  await notificationService.markRead(req.user._id, req.params.id);
  return success(res, { message: "Notification marked read", data: null });
}

async function markAllRead(req, res) {
  await notificationService.markAllRead(req.user._id);
  return success(res, { message: "All notifications marked read", data: null });
}

module.exports = { list, markRead, markAllRead };

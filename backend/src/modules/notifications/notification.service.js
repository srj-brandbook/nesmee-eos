const Notification = require("../../models/Notification");
const { parsePagination, paginationMeta } = require("../../utils/pagination");
const ApiError = require("../../utils/ApiError");

async function create({ userId, type, title, body = "", data = {}, channels = ["in_app"] }) {
  return Notification.create({ userId, type, title, body, data, channels });
}

async function listForUser(userId, query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = { userId };
  if (query.unread === "true") filter.readAt = null;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, readAt: null }),
  ]);

  return {
    items: items.map((item) => ({
      id: String(item._id),
      type: item.type,
      title: item.title,
      body: item.body,
      data: item.data,
      readAt: item.readAt,
      createdAt: item.createdAt,
    })),
    unreadCount,
    pagination: paginationMeta({ page, limit, total }),
  };
}

async function markRead(userId, id) {
  const notification = await Notification.findOneAndUpdate(
    { _id: id, userId },
    { readAt: new Date() },
    { new: true }
  ).lean();
  if (!notification) throw ApiError.notFound("Notification not found");
  return notification;
}

async function markAllRead(userId) {
  await Notification.updateMany({ userId, readAt: null }, { readAt: new Date() });
}

module.exports = { create, listForUser, markRead, markAllRead };

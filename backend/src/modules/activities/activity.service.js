const Activity = require("../../models/Activity");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializeActivity } = require("../../utils/crmSerializer");
const { CALENDAR_TYPES } = require("../../constants/crm");
const auditService = require("../audit/audit.service");
const calendarAdapter = require("../calendar/calendar.adapter");

const POPULATE = [
  { path: "assignedToId", select: "name email" },
  { path: "leadId", select: "name email stage" },
  { path: "contactId", select: "name role email phone" },
];

function notDeleted(extra = {}) {
  return { deletedAt: null, ...extra };
}

function emptyToNull(value) {
  return value === "" ? null : value;
}

function defaultsForType(payload) {
  if (payload.type === "note" || payload.type === "status_change") {
    if (!payload.status) return { ...payload, status: "done" };
  }
  if (["follow_up", "task", "appointment", "meeting", "call"].includes(payload.type) && !payload.status) {
    return { ...payload, status: "scheduled" };
  }
  return payload;
}

async function syncExternal(activity, action) {
  if (!["appointment", "meeting"].includes(activity.type)) return;
  const result = await calendarAdapter[action](activity);
  if (result.externalEventId !== undefined) activity.externalEventId = result.externalEventId;
  if (result.externalSyncStatus) activity.externalSyncStatus = result.externalSyncStatus;
}

async function list(query) {
  const { page, limit, skip } = parsePagination({ ...query, limit: query.limit || 50 });
  const sort = parseSort(query.sort, ["createdAt", "startsAt", "dueAt", "reminderAt"]);
  const filter = notDeleted();
  // Team-wide: permission grants access to all records. Only filter by assignee when requested.
  if (query.type) filter.type = query.type;
  if (query.status) filter.status = query.status;
  if (query.leadId) filter.leadId = query.leadId;
  if (query.contactId) filter.contactId = query.contactId;
  if (query.assignedToId) filter.assignedToId = query.assignedToId;
  if (query.hasReminder === true || query.hasReminder === "true") {
    filter.reminderAt = { $ne: null };
  }
  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { body: { $regex: query.search, $options: "i" } },
      { location: { $regex: query.search, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Activity.find(filter).populate(POPULATE).sort(sort).skip(skip).limit(limit).lean(),
    Activity.countDocuments(filter),
  ]);

  return {
    items: items.map(serializeActivity),
    pagination: paginationMeta({ page, limit, total }),
  };
}

async function getById(id) {
  const activity = await Activity.findOne(notDeleted({ _id: id })).populate(POPULATE).lean();
  if (!activity) throw ApiError.notFound("Activity not found");
  return serializeActivity(activity);
}

function normalize(payload) {
  const next = defaultsForType({ ...payload });
  ["leadId", "contactId", "assignedToId", "startsAt", "endsAt", "dueAt", "reminderAt"].forEach((key) => {
    if (next[key] !== undefined) next[key] = emptyToNull(next[key]);
  });
  return next;
}

async function create(payload, actor, req) {
  const data = normalize(payload);
  if (!data.assignedToId) data.assignedToId = actor._id;
  const activity = await Activity.create(data);
  await syncExternal(activity, "createEvent");
  await activity.save();
  await auditService.log({
    actor,
    action: "create",
    module: "activities",
    resourceType: "Activity",
    resourceId: activity._id,
    req,
    metadata: { type: activity.type },
  });
  return getById(activity._id);
}

async function update(id, payload, actor, req) {
  const activity = await Activity.findOne(notDeleted({ _id: id }));
  if (!activity) throw ApiError.notFound("Activity not found");
  Object.assign(activity, normalize(payload));
  await syncExternal(activity, "updateEvent");
  await activity.save();
  await auditService.log({
    actor,
    action: "update",
    module: "activities",
    resourceType: "Activity",
    resourceId: activity._id,
    req,
    metadata: { type: activity.type },
  });
  return getById(activity._id);
}

async function remove(id, actor, req) {
  const activity = await Activity.findOne(notDeleted({ _id: id }));
  if (!activity) throw ApiError.notFound("Activity not found");
  await syncExternal(activity, "deleteEvent");
  activity.deletedAt = new Date();
  await activity.save();
  await auditService.log({
    actor,
    action: "delete",
    module: "activities",
    resourceType: "Activity",
    resourceId: activity._id,
    req,
  });
}

async function calendar({ from, to, assignedToId }) {
  const start = new Date(from);
  const end = new Date(to);
  const filter = notDeleted({
    status: { $ne: "cancelled" },
    type: { $in: CALENDAR_TYPES },
    $or: [
      { startsAt: { $gte: start, $lte: end } },
      { dueAt: { $gte: start, $lte: end } },
    ],
  });
  if (assignedToId) filter.assignedToId = assignedToId;

  const items = await Activity.find(filter).populate(POPULATE).sort({ startsAt: 1, dueAt: 1 }).lean();
  return { items: items.map(serializeActivity) };
}

module.exports = { list, getById, create, update, remove, calendar };

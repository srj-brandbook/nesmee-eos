const AuditLog = require("../../models/AuditLog");
const { parsePagination, paginationMeta } = require("../../utils/pagination");

function requestContext(req = {}) {
  return {
    ip: req.ip || req.headers?.["x-forwarded-for"] || "",
    userAgent: req.get?.("user-agent") || req.headers?.["user-agent"] || "",
  };
}

async function log({ actor, action, module, resourceType = "", resourceId = "", req, metadata = {} }) {
  const context = requestContext(req);
  await AuditLog.create({
    actorId: actor?._id || actor?.id || null,
    actorEmail: actor?.email || "",
    action,
    module,
    resourceType,
    resourceId: resourceId ? String(resourceId) : "",
    ip: context.ip,
    userAgent: context.userAgent,
    metadata,
  });
}

async function list(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.actorId) filter.actorId = query.actorId;
  if (query.module) filter.module = query.module;
  if (query.action) filter.action = query.action;
  if (query.resourceId) filter.resourceId = String(query.resourceId);
  if (query.resourceType) filter.resourceType = query.resourceType;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    items: items.map((item) => ({
      id: String(item._id),
      actorId: item.actorId ? String(item.actorId) : null,
      actorEmail: item.actorEmail,
      action: item.action,
      module: item.module,
      resourceType: item.resourceType,
      resourceId: item.resourceId,
      ip: item.ip,
      userAgent: item.userAgent,
      metadata: item.metadata,
      createdAt: item.createdAt,
    })),
    pagination: paginationMeta({ page, limit, total }),
  };
}

module.exports = { log, list };

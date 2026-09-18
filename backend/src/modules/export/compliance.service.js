const ExportRequirement = require("../../models/ExportRequirement");
const ExportTradeRule = require("../../models/ExportTradeRule");
const ExportRisk = require("../../models/ExportRisk");
const ExportMarket = require("../../models/ExportMarket");
const ExportCorridor = require("../../models/ExportCorridor");
const ExportSettings = require("../../models/ExportSettings");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializeRequirement, serializeRule, serializeRisk } = require("../../utils/exportSerializer");
const auditService = require("../audit/audit.service");
const { evaluateRules, evaluateGroup } = require("./engines/tradeRule.engine");
const { notDeleted, cleanOwner, stamp } = require("./export.helpers");
const { OWNER_SELECT } = require("./config.service");

function deriveRequirementStatus(item, expiryDays = 30) {
  if (item.status === "waived") return "waived";
  if (!item.expiryDate) return item.status || "pending";
  const expiry = new Date(item.expiryDate);
  const now = new Date();
  if (expiry < now) return "expired";
  const soon = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);
  if (expiry <= soon) return "expiring";
  return item.status === "draft" ? "draft" : item.status || "compliant";
}

async function listRequirements(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "expiryDate", "name", "status"]);
  const filter = notDeleted();
  if (query.marketId) filter.marketId = query.marketId;
  if (query.productId) filter.productId = query.productId;
  if (query.status) filter.status = query.status;
  if (query.requirementType) filter.requirementType = query.requirementType;
  if (query.search) filter.name = { $regex: query.search, $options: "i" };
  const settings = await ExportSettings.findOne({ key: "export" }).lean();
  const [items, total] = await Promise.all([
    ExportRequirement.find(filter).populate("marketId", "name").populate("productId", "name").sort(sort).skip(skip).limit(limit).lean(),
    ExportRequirement.countDocuments(filter),
  ]);
  return {
    items: items.map((item) => serializeRequirement({ ...item, status: deriveRequirementStatus(item, settings?.requirementExpiryDays) })),
    pagination: paginationMeta({ page, limit, total }),
  };
}

async function createRequirement(payload, actor, req) {
  const item = await ExportRequirement.create({
    ...payload,
    responsibleUserId: cleanOwner(payload.responsibleUserId),
    ...stamp(actor, true),
  });
  await auditService.log({ actor, action: "create", module: "export-compliance", resourceType: "ExportRequirement", resourceId: item._id, req });
  const hydrated = await ExportRequirement.findById(item._id).populate("marketId", "name").populate("productId", "name").lean();
  return serializeRequirement(hydrated);
}

async function updateRequirement(id, payload, actor, req) {
  const item = await ExportRequirement.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Requirement not found");
  Object.assign(item, payload, stamp(actor));
  if (payload.responsibleUserId !== undefined) item.responsibleUserId = cleanOwner(payload.responsibleUserId);
  await item.save();
  await auditService.log({ actor, action: "update", module: "export-compliance", resourceType: "ExportRequirement", resourceId: item._id, req });
  const hydrated = await ExportRequirement.findById(item._id).populate("marketId", "name").populate("productId", "name").lean();
  return serializeRequirement(hydrated);
}

async function removeRequirement(id, actor, req) {
  const item = await ExportRequirement.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Requirement not found");
  item.deletedAt = new Date();
  await item.save();
  await auditService.log({ actor, action: "delete", module: "export-compliance", resourceType: "ExportRequirement", resourceId: item._id, req });
}

async function listRules(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = notDeleted();
  if (query.enabled === "true") filter.enabled = true;
  if (query.enabled === "false") filter.enabled = false;
  if (query.search) filter.name = { $regex: query.search, $options: "i" };
  const [items, total] = await Promise.all([
    ExportTradeRule.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    ExportTradeRule.countDocuments(filter),
  ]);
  return { items: items.map(serializeRule), pagination: paginationMeta({ page, limit, total }) };
}

async function createRule(payload, actor, req) {
  const item = await ExportTradeRule.create({ ...payload, ...stamp(actor, true) });
  await auditService.log({ actor, action: "create", module: "export-rules", resourceType: "ExportTradeRule", resourceId: item._id, req });
  return serializeRule(item);
}

async function updateRule(id, payload, actor, req) {
  const item = await ExportTradeRule.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Trade rule not found");
  Object.assign(item, payload, stamp(actor));
  if (payload.conditionGroup || payload.actions) item.version = (item.version || 1) + 1;
  await item.save();
  await auditService.log({ actor, action: "update", module: "export-rules", resourceType: "ExportTradeRule", resourceId: item._id, req });
  return serializeRule(item);
}

async function removeRule(id, actor, req) {
  const item = await ExportTradeRule.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Trade rule not found");
  item.deletedAt = new Date();
  await item.save();
  await auditService.log({ actor, action: "delete", module: "export-rules", resourceType: "ExportTradeRule", resourceId: item._id, req });
}

async function testRule(id, facts = {}) {
  const item = await ExportTradeRule.findOne(notDeleted({ _id: id })).lean();
  if (!item) throw ApiError.notFound("Trade rule not found");
  const evaluation = evaluateGroup(item.conditionGroup, facts);
  return { matched: evaluation.matched, results: evaluation.results, actions: evaluation.matched ? item.actions : [] };
}

async function evaluateFacts(facts = {}) {
  const rules = await ExportTradeRule.find(notDeleted({ enabled: true })).sort({ priority: -1 }).lean();
  return evaluateRules(rules, facts);
}

async function listRisks(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "score", "severity", "status"]);
  const filter = notDeleted();
  if (query.scopeType) filter.scopeType = query.scopeType;
  if (query.scopeId) filter.scopeId = query.scopeId;
  if (query.status) filter.status = query.status;
  if (query.severity) filter.severity = query.severity;
  const [items, total] = await Promise.all([
    ExportRisk.find(filter).populate("ownerId", OWNER_SELECT).sort(sort).skip(skip).limit(limit).lean(),
    ExportRisk.countDocuments(filter),
  ]);
  return { items: items.map(serializeRisk), pagination: paginationMeta({ page, limit, total }) };
}

async function rollupRisk(scopeType, scopeId) {
  const open = await ExportRisk.find(notDeleted({ scopeType, scopeId, status: { $in: ["open", "monitoring"] } })).lean();
  if (!open.length) return 0;
  const avg = open.reduce((sum, item) => sum + Number(item.score || 0), 0) / open.length;
  return Math.round(avg * 100) / 100;
}

async function createRisk(payload, actor, req) {
  const item = await ExportRisk.create({ ...payload, ownerId: cleanOwner(payload.ownerId) || actor._id, ...stamp(actor, true) });
  const score = await rollupRisk(item.scopeType, item.scopeId);
  if (item.scopeType === "market") await ExportMarket.updateOne({ _id: item.scopeId }, { $set: { riskScore: score } });
  if (item.scopeType === "corridor") await ExportCorridor.updateOne({ _id: item.scopeId }, { $set: { riskScore: score } });
  await auditService.log({ actor, action: "create", module: "export-risks", resourceType: "ExportRisk", resourceId: item._id, req });
  const hydrated = await ExportRisk.findById(item._id).populate("ownerId", OWNER_SELECT).lean();
  return serializeRisk(hydrated);
}

async function updateRisk(id, payload, actor, req) {
  const item = await ExportRisk.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Risk not found");
  Object.assign(item, payload, stamp(actor));
  if (payload.ownerId !== undefined) item.ownerId = cleanOwner(payload.ownerId);
  await item.save();
  const score = await rollupRisk(item.scopeType, item.scopeId);
  if (item.scopeType === "market") await ExportMarket.updateOne({ _id: item.scopeId }, { $set: { riskScore: score } });
  if (item.scopeType === "corridor") await ExportCorridor.updateOne({ _id: item.scopeId }, { $set: { riskScore: score } });
  await auditService.log({ actor, action: "update", module: "export-risks", resourceType: "ExportRisk", resourceId: item._id, req });
  const hydrated = await ExportRisk.findById(item._id).populate("ownerId", OWNER_SELECT).lean();
  return serializeRisk(hydrated);
}

async function removeRisk(id, actor, req) {
  const item = await ExportRisk.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Risk not found");
  item.deletedAt = new Date();
  await item.save();
  const score = await rollupRisk(item.scopeType, item.scopeId);
  if (item.scopeType === "market") await ExportMarket.updateOne({ _id: item.scopeId }, { $set: { riskScore: score } });
  if (item.scopeType === "corridor") await ExportCorridor.updateOne({ _id: item.scopeId }, { $set: { riskScore: score } });
  await auditService.log({ actor, action: "delete", module: "export-risks", resourceType: "ExportRisk", resourceId: item._id, req });
}

module.exports = {
  deriveRequirementStatus,
  listRequirements,
  createRequirement,
  updateRequirement,
  removeRequirement,
  listRules,
  createRule,
  updateRule,
  removeRule,
  testRule,
  evaluateFacts,
  listRisks,
  createRisk,
  updateRisk,
  removeRisk,
};

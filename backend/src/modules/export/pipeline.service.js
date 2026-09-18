const ExportBuyer = require("../../models/ExportBuyer");
const ExportOpportunity = require("../../models/ExportOpportunity");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializeBuyer, serializeOpportunity } = require("../../utils/exportSerializer");
const auditService = require("../audit/audit.service");
const notificationService = require("../notifications/notification.service");
const { notDeleted, cleanOwner, stamp, hideFinance } = require("./export.helpers");
const { OWNER_SELECT } = require("./config.service");
const { OPPORTUNITY_STAGES } = require("../../constants/export");

async function listBuyers(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "name", "status", "creditRisk"]);
  const filter = notDeleted();
  if (query.marketId) filter.marketId = query.marketId;
  if (query.status) filter.status = query.status;
  if (query.ownerId) filter.ownerId = query.ownerId;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { legalName: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
      { city: { $regex: query.search, $options: "i" } },
    ];
  }
  const [items, total] = await Promise.all([
    ExportBuyer.find(filter).populate("marketId", "name countryCode").populate("ownerId", OWNER_SELECT).sort(sort).skip(skip).limit(limit).lean(),
    ExportBuyer.countDocuments(filter),
  ]);
  return { items: items.map(serializeBuyer), pagination: paginationMeta({ page, limit, total }) };
}

async function getBuyer(id) {
  const item = await ExportBuyer.findOne(notDeleted({ _id: id })).populate("marketId", "name countryCode").populate("ownerId", OWNER_SELECT).lean();
  if (!item) throw ApiError.notFound("Distributor not found");
  return serializeBuyer(item);
}

async function createBuyer(payload, actor, req) {
  const item = await ExportBuyer.create({
    ...payload,
    ownerId: cleanOwner(payload.ownerId) || actor._id,
    ...stamp(actor, true),
  });
  await auditService.log({ actor, action: "create", module: "export-buyers", resourceType: "ExportBuyer", resourceId: item._id, req });
  return getBuyer(item._id);
}

async function updateBuyer(id, payload, actor, req) {
  const item = await ExportBuyer.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Distributor not found");
  Object.assign(item, payload, stamp(actor));
  if (payload.ownerId !== undefined) item.ownerId = cleanOwner(payload.ownerId);
  await item.save();
  await auditService.log({ actor, action: "update", module: "export-buyers", resourceType: "ExportBuyer", resourceId: item._id, req });
  return getBuyer(item._id);
}

async function removeBuyer(id, actor, req) {
  const item = await ExportBuyer.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Distributor not found");
  item.deletedAt = new Date();
  await item.save();
  await auditService.log({ actor, action: "delete", module: "export-buyers", resourceType: "ExportBuyer", resourceId: item._id, req });
}

async function startBuyerOnboarding(id, actor, req) {
  const item = await ExportBuyer.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Distributor not found");
  if (item.status === "inactive") throw ApiError.badRequest("An inactive distributor cannot start onboarding");
  const onboardingService = require("../forms/onboarding.service");
  const started = await onboardingService.start({ subjectType: "buyer", subjectId: item._id, actor, req });
  if (started.missingForm) {
    throw ApiError.conflict("Publish and tag a distributor onboarding form before starting");
  }
  if (item.status !== "active") {
    item.status = "onboarding";
    Object.assign(item, stamp(actor));
    await item.save();
  }
  await auditService.log({
    actor,
    action: "onboarding_start",
    module: "export-buyers",
    resourceType: "ExportBuyer",
    resourceId: item._id,
    req,
    metadata: { submissionId: started.onboarding?.id },
  });
  return { buyer: await getBuyer(item._id), onboarding: started.onboarding };
}

function applyStageTimestamps(item, stage) {
  if (stage === "converted") {
    item.convertedAt = item.convertedAt || new Date();
    item.lostAt = null;
  } else if (stage === "lost") {
    item.lostAt = new Date();
  } else {
    if (!["converted"].includes(stage)) item.convertedAt = null;
    if (stage !== "lost") item.lostAt = null;
  }
}

async function listOpportunities(query = {}, req) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "title", "stage", "expectedRevenue", "probability", "expectedShipmentDate"]);
  const filter = notDeleted();
  if (query.stage) filter.stage = query.stage;
  if (query.marketId) filter.marketId = query.marketId;
  if (query.productId) filter.productId = query.productId;
  if (query.buyerId) filter.buyerId = query.buyerId;
  if (query.corridorId) filter.corridorId = query.corridorId;
  if (query.ownerId) filter.ownerId = query.ownerId;
  if (query.search) filter.title = { $regex: query.search, $options: "i" };
  const [items, total] = await Promise.all([
    ExportOpportunity.find(filter)
      .populate("marketId", "name countryCode")
      .populate("productId", "name sku")
      .populate("buyerId", "name")
      .populate("corridorId", "name code")
      .populate("ownerId", OWNER_SELECT)
      .sort(sort)
      .skip(skip)
      .limit(query.board === "true" ? 100 : limit)
      .lean(),
    ExportOpportunity.countDocuments(filter),
  ]);
  const finance = hideFinance(req);
  return { items: items.map((item) => serializeOpportunity(item, finance)), pagination: paginationMeta({ page, limit, total }) };
}

async function getOpportunity(id, req) {
  const item = await ExportOpportunity.findOne(notDeleted({ _id: id }))
    .populate("marketId", "name countryCode")
    .populate("productId", "name sku")
    .populate("buyerId", "name")
    .populate("corridorId", "name code")
    .populate("ownerId", OWNER_SELECT)
    .lean();
  if (!item) throw ApiError.notFound("Opportunity not found");
  return serializeOpportunity(item, hideFinance(req));
}

async function notifyOwner(previous, next, actor, title, body, data) {
  if (!next || String(next) === String(actor._id)) return;
  if (previous && String(previous) === String(next)) return;
  await notificationService.create({ userId: next, type: "export_assignment", title, body, data });
}

async function createOpportunity(payload, actor, req) {
  const item = await ExportOpportunity.create({
    ...payload,
    ownerId: cleanOwner(payload.ownerId) || actor._id,
    ...stamp(actor, true),
  });
  await auditService.log({ actor, action: "create", module: "export-opportunities", resourceType: "ExportOpportunity", resourceId: item._id, req });
  await notifyOwner(null, item.ownerId, actor, "Export opportunity assigned", `${item.title} was assigned to you.`, {
    opportunityId: String(item._id),
  });
  return getOpportunity(item._id, req);
}

async function updateOpportunity(id, payload, actor, req) {
  const item = await ExportOpportunity.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Opportunity not found");
  const previousOwner = item.ownerId;
  const previousStage = item.stage;
  Object.assign(item, payload, stamp(actor));
  if (payload.ownerId !== undefined) item.ownerId = cleanOwner(payload.ownerId);
  if (payload.stage && payload.stage !== previousStage) {
    if (!OPPORTUNITY_STAGES.includes(payload.stage)) throw ApiError.validation({ stage: "Invalid stage" });
    applyStageTimestamps(item, payload.stage);
  }
  await item.save();
  await auditService.log({
    actor,
    action: payload.stage && payload.stage !== previousStage ? "stage_move" : "update",
    module: "export-opportunities",
    resourceType: "ExportOpportunity",
    resourceId: item._id,
    req,
    metadata: { from: previousStage, to: item.stage },
  });
  await notifyOwner(previousOwner, item.ownerId, actor, "Export opportunity assigned", `${item.title} was assigned to you.`, {
    opportunityId: String(item._id),
  });
  return getOpportunity(item._id, req);
}

async function updateOpportunityStage(id, payload, actor, req) {
  return updateOpportunity(id, { stage: payload.stage, lostReason: payload.lostReason, notes: payload.notes }, actor, req);
}

async function removeOpportunity(id, actor, req) {
  const item = await ExportOpportunity.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Opportunity not found");
  item.deletedAt = new Date();
  await item.save();
  await auditService.log({ actor, action: "delete", module: "export-opportunities", resourceType: "ExportOpportunity", resourceId: item._id, req });
}

module.exports = {
  listBuyers,
  getBuyer,
  createBuyer,
  updateBuyer,
  removeBuyer,
  startBuyerOnboarding,
  listOpportunities,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  updateOpportunityStage,
  removeOpportunity,
};

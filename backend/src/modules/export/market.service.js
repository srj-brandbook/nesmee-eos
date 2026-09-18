const ExportMarket = require("../../models/ExportMarket");
const ExportCorridor = require("../../models/ExportCorridor");
const ExportMarketProduct = require("../../models/ExportMarketProduct");
const ExportRequirement = require("../../models/ExportRequirement");
const ExportRisk = require("../../models/ExportRisk");
const ExportOpportunity = require("../../models/ExportOpportunity");
const ExportBuyer = require("../../models/ExportBuyer");
const ExportPricing = require("../../models/ExportPricing");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializeMarket } = require("../../utils/exportSerializer");
const auditService = require("../audit/audit.service");
const { scoreFromBreakdown } = require("./engines/score.engine");
const { activeScoreProfile } = require("./config.service");
const { notDeleted, cleanOwner, stamp, hideFinance } = require("./export.helpers");
const { OWNER_SELECT } = require("./config.service");
const { MARKET_STATUSES } = require("../../constants/export");

async function countsFor(marketId) {
  const [products, corridors, buyers, requirements, risks, opportunities, pricing] = await Promise.all([
    ExportMarketProduct.countDocuments(notDeleted({ marketId })),
    ExportCorridor.countDocuments(notDeleted({ marketId })),
    ExportBuyer.countDocuments(notDeleted({ marketId })),
    ExportRequirement.countDocuments(notDeleted({ marketId })),
    ExportRisk.countDocuments(notDeleted({ scopeType: "market", scopeId: marketId })),
    ExportOpportunity.countDocuments(notDeleted({ marketId })),
    ExportPricing.countDocuments(notDeleted({ marketId })),
  ]);
  return { products, corridors, buyers, requirements, risks, opportunities, pricing };
}

async function listMarkets(query = {}, req) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "name", "status", "opportunityScore", "expectedMargin", "countryCode"]);
  const filter = notDeleted();
  if (query.status) filter.status = query.status;
  if (query.region) filter.regionCode = String(query.region).toUpperCase();
  if (query.ownerId) filter.ownerId = query.ownerId;
  if (query.marketType) filter.marketType = query.marketType;
  if (query.countryCode) filter.countryCode = String(query.countryCode).toUpperCase();
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { countryName: { $regex: query.search, $options: "i" } },
      { countryCode: { $regex: query.search, $options: "i" } },
    ];
  }
  const [items, total] = await Promise.all([
    ExportMarket.find(filter).populate("ownerId", OWNER_SELECT).populate("managerId", OWNER_SELECT).sort(sort).skip(skip).limit(limit).lean(),
    ExportMarket.countDocuments(filter),
  ]);
  const ids = items.map((item) => item._id);
  const corridors = await ExportCorridor.aggregate([
    { $match: { deletedAt: null, marketId: { $in: ids } } },
    { $group: { _id: "$marketId", count: { $sum: 1 } } },
  ]);
  const corridorMap = Object.fromEntries(corridors.map((row) => [String(row._id), row.count]));
  const finance = hideFinance(req);
  return {
    items: items.map((item) => serializeMarket(item, { corridorCount: corridorMap[String(item._id)] || 0 }, finance)),
    pagination: paginationMeta({ page, limit, total }),
  };
}

async function getMarket(id, req) {
  const item = await ExportMarket.findOne(notDeleted({ _id: id })).populate("ownerId", OWNER_SELECT).populate("managerId", OWNER_SELECT).lean();
  if (!item) throw ApiError.notFound("Market not found");
  const counts = await countsFor(item._id);
  return serializeMarket(item, { counts }, hideFinance(req));
}

async function createMarket(payload, actor, req) {
  const item = await ExportMarket.create({
    ...payload,
    countryCode: String(payload.countryCode || "").toUpperCase(),
    ownerId: cleanOwner(payload.ownerId) || actor._id,
    managerId: cleanOwner(payload.managerId),
    ...stamp(actor, true),
  });
  await auditService.log({ actor, action: "create", module: "export-markets", resourceType: "ExportMarket", resourceId: item._id, req });
  return getMarket(item._id, req);
}

function assertStatusTransition(from, to, canApprove) {
  if (to === from) return;
  if (!MARKET_STATUSES.includes(to)) throw ApiError.validation({ status: "Invalid status" });
  if (["approved", "active"].includes(to) && !["approved", "active"].includes(from) && !canApprove) {
    throw ApiError.forbidden("You do not have permission to approve markets");
  }
}

async function updateMarket(id, payload, actor, req) {
  const item = await ExportMarket.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Market not found");
  if (payload.status && payload.status !== item.status) {
    assertStatusTransition(item.status, payload.status, req?.isSuperAdmin || (req?.permissions || []).includes("export.markets.approve"));
  }
  const previous = { status: item.status, ownerId: item.ownerId };
  Object.assign(item, payload, stamp(actor));
  if (payload.countryCode) item.countryCode = String(payload.countryCode).toUpperCase();
  if (payload.ownerId !== undefined) item.ownerId = cleanOwner(payload.ownerId);
  if (payload.managerId !== undefined) item.managerId = cleanOwner(payload.managerId);
  await item.save();
  await auditService.log({
    actor,
    action: payload.status && payload.status !== previous.status ? "stage_move" : "update",
    module: "export-markets",
    resourceType: "ExportMarket",
    resourceId: item._id,
    req,
    metadata: { before: previous, after: { status: item.status, ownerId: item.ownerId } },
  });
  return getMarket(item._id, req);
}

async function removeMarket(id, actor, req) {
  const item = await ExportMarket.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Market not found");
  item.deletedAt = new Date();
  await item.save();
  await auditService.log({ actor, action: "delete", module: "export-markets", resourceType: "ExportMarket", resourceId: item._id, req });
}

async function evaluateMarket(id, payload, actor, req) {
  const item = await ExportMarket.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Market not found");
  const profile = await activeScoreProfile("market");
  const result = scoreFromBreakdown(profile, payload.breakdown || payload.scoreBreakdown || {});
  if (result.error) throw ApiError.validation({ breakdown: result.error }, result.error);
  item.scoreBreakdown = result.breakdown;
  item.opportunityScore = result.score;
  item.scoreLabel = result.label;
  if (payload.riskScore != null) item.riskScore = payload.riskScore;
  Object.assign(item, stamp(actor));
  await item.save();
  await auditService.log({
    actor,
    action: "evaluate",
    module: "export-markets",
    resourceType: "ExportMarket",
    resourceId: item._id,
    req,
    metadata: { score: result.score, label: result.label },
  });
  return getMarket(item._id, req);
}

async function scoreMarket(id, payload, actor, req) {
  return evaluateMarket(id, payload || {}, actor, req);
}

async function compareMarkets(ids = [], req) {
  if (!ids.length) throw ApiError.validation({ ids: "Select at least two markets" });
  const items = await ExportMarket.find(notDeleted({ _id: { $in: ids } }))
    .populate("ownerId", OWNER_SELECT)
    .lean();
  const profile = await activeScoreProfile("market").catch(() => null);
  const finance = hideFinance(req);
  return {
    profile: profile
      ? { id: String(profile._id), name: profile.name, factors: profile.factors, thresholds: profile.thresholds }
      : null,
    items: items.map((item) => serializeMarket(item, {}, finance)),
  };
}

module.exports = {
  listMarkets,
  getMarket,
  createMarket,
  updateMarket,
  removeMarket,
  evaluateMarket,
  scoreMarket,
  compareMarkets,
  countsFor,
};

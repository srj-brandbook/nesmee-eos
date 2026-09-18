const ExportCorridor = require("../../models/ExportCorridor");
const ExportMarket = require("../../models/ExportMarket");
const ExportCorridorPerformance = require("../../models/ExportCorridorPerformance");
const ExportRisk = require("../../models/ExportRisk");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializeCorridor, serializePerformance } = require("../../utils/exportSerializer");
const auditService = require("../audit/audit.service");
const { scoreFromBreakdown } = require("./engines/score.engine");
const { calculateLandedCost } = require("./engines/landedCost.engine");
const { activeScoreProfile, loadFxRates } = require("./config.service");
const ExportIncoterm = require("../../models/ExportIncoterm");
const ExportLookup = require("../../models/ExportLookup");
const { notDeleted, cleanOwner, stamp, hideFinance, makeKey } = require("./export.helpers");
const { OWNER_SELECT } = require("./config.service");

function normalizeSegments(segments = []) {
  return (segments || []).map((segment, index) => ({
    key: segment.key || makeKey(),
    sequence: segment.sequence != null ? segment.sequence : index,
    locationType: segment.locationType || "transit",
    locationId: segment.locationId || null,
    locationLabel: segment.locationLabel || "",
    mode: segment.mode || "",
    carrier: segment.carrier || "",
    transitMinDays: Number(segment.transitMinDays || 0),
    transitAvgDays: Number(segment.transitAvgDays || 0),
    transitMaxDays: Number(segment.transitMaxDays || 0),
    costAmount: Number(segment.costAmount || 0),
    costCurrency: String(segment.costCurrency || "INR").toUpperCase(),
    costComponentCode: segment.costComponentCode || "",
    riskScore: Number(segment.riskScore || 0),
    notes: segment.notes || "",
  }));
}

function rollupTransit(segments = []) {
  return {
    transitMinDays: segments.reduce((sum, item) => sum + Number(item.transitMinDays || 0), 0),
    transitAvgDays: segments.reduce((sum, item) => sum + Number(item.transitAvgDays || 0), 0),
    transitMaxDays: segments.reduce((sum, item) => sum + Number(item.transitMaxDays || 0), 0),
  };
}

async function listCorridors(query = {}, req) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "name", "status", "corridorScore", "transitAvgDays", "priority"]);
  const filter = notDeleted();
  if (query.marketId) filter.marketId = query.marketId;
  if (query.status) filter.status = query.status;
  if (query.primaryMode) filter.primaryMode = query.primaryMode;
  if (query.originCountryCode) filter.originCountryCode = String(query.originCountryCode).toUpperCase();
  if (query.destCountryCode) filter.destCountryCode = String(query.destCountryCode).toUpperCase();
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { code: { $regex: query.search, $options: "i" } },
      { originCity: { $regex: query.search, $options: "i" } },
      { destCity: { $regex: query.search, $options: "i" } },
    ];
  }
  const [items, total] = await Promise.all([
    ExportCorridor.find(filter).populate("marketId", "name countryCode currencyCode").populate("ownerId", OWNER_SELECT).sort(sort).skip(skip).limit(limit).lean(),
    ExportCorridor.countDocuments(filter),
  ]);
  const finance = hideFinance(req);
  return { items: items.map((item) => serializeCorridor(item, {}, finance)), pagination: paginationMeta({ page, limit, total }) };
}

async function getCorridor(id, req) {
  const item = await ExportCorridor.findOne(notDeleted({ _id: id }))
    .populate("marketId", "name countryCode currencyCode")
    .populate("ownerId", OWNER_SELECT)
    .lean();
  if (!item) throw ApiError.notFound("Corridor not found");
  const [risks, performance] = await Promise.all([
    ExportRisk.countDocuments(notDeleted({ scopeType: "corridor", scopeId: item._id })),
    ExportCorridorPerformance.countDocuments(notDeleted({ corridorId: item._id })),
  ]);
  return serializeCorridor(item, { counts: { risks, performance } }, hideFinance(req));
}

async function createCorridor(payload, actor, req) {
  const market = await ExportMarket.findOne(notDeleted({ _id: payload.marketId }));
  if (!market) throw ApiError.notFound("Market not found");
  const segments = normalizeSegments(payload.segments);
  const transit = rollupTransit(segments);
  const item = await ExportCorridor.create({
    ...payload,
    destCountryCode: payload.destCountryCode || market.countryCode,
    segments,
    costs: payload.costs || [],
    ownerId: cleanOwner(payload.ownerId) || actor._id,
    ...transit,
    ...stamp(actor, true),
  });
  if (payload.isPrimary) {
    await ExportCorridor.updateMany({ marketId: item.marketId, _id: { $ne: item._id }, deletedAt: null }, { $set: { isPrimary: false } });
  }
  await auditService.log({ actor, action: "create", module: "export-corridors", resourceType: "ExportCorridor", resourceId: item._id, req });
  return getCorridor(item._id, req);
}

async function updateCorridor(id, payload, actor, req) {
  const item = await ExportCorridor.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Corridor not found");
  const previous = { status: item.status, isPrimary: item.isPrimary };
  Object.assign(item, payload, stamp(actor));
  if (payload.ownerId !== undefined) item.ownerId = cleanOwner(payload.ownerId);
  if (payload.segments) {
    item.segments = normalizeSegments(payload.segments);
    Object.assign(item, rollupTransit(item.segments));
  }
  if (payload.costs) item.costs = payload.costs;
  if (payload.isPrimary) {
    await ExportCorridor.updateMany({ marketId: item.marketId, _id: { $ne: item._id }, deletedAt: null }, { $set: { isPrimary: false } });
    item.isPrimary = true;
  }
  await item.save();
  await auditService.log({
    actor,
    action: payload.status && payload.status !== previous.status ? "stage_move" : "update",
    module: "export-corridors",
    resourceType: "ExportCorridor",
    resourceId: item._id,
    req,
    metadata: { before: previous, after: { status: item.status, isPrimary: item.isPrimary } },
  });
  return getCorridor(item._id, req);
}

async function removeCorridor(id, actor, req) {
  const item = await ExportCorridor.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Corridor not found");
  item.deletedAt = new Date();
  await item.save();
  await auditService.log({ actor, action: "delete", module: "export-corridors", resourceType: "ExportCorridor", resourceId: item._id, req });
}

async function scoreCorridor(id, payload, actor, req) {
  const item = await ExportCorridor.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Corridor not found");
  const profile = await activeScoreProfile("corridor");
  const breakdown = payload?.breakdown || payload?.scoreBreakdown || {};
  if (breakdown.historical_otd == null) breakdown.historical_otd = 50;
  const result = scoreFromBreakdown(profile, breakdown);
  if (result.error) throw ApiError.validation({ breakdown: result.error }, result.error);
  item.scoreBreakdown = result.breakdown;
  item.corridorScore = result.score;
  item.scoreLabel = result.label;
  if (payload?.riskScore != null) item.riskScore = payload.riskScore;
  Object.assign(item, stamp(actor));
  await item.save();
  await auditService.log({
    actor,
    action: "evaluate",
    module: "export-corridors",
    resourceType: "ExportCorridor",
    resourceId: item._id,
    req,
    metadata: { score: result.score },
  });
  return getCorridor(item._id, req);
}

async function compareCorridors(ids = [], req) {
  if (!ids.length || ids.length < 2) throw ApiError.validation({ corridorIds: "Select at least two corridors" });
  const items = await ExportCorridor.find(notDeleted({ _id: { $in: ids } }))
    .populate("marketId", "name countryCode currencyCode")
    .lean();
  const profile = await activeScoreProfile("corridor").catch(() => null);
  const incoterm = await ExportIncoterm.findOne(notDeleted({ code: "CIF", status: "active" })).lean();
  const components = await ExportLookup.find(notDeleted({ type: "cost_component", status: "active" })).lean();
  const rates = await loadFxRates();
  const finance = hideFinance(req);

  const compared = items.map((item) => {
    const result = calculateLandedCost({
      lines: (item.costs || []).map((cost) => ({
        componentCode: cost.componentCode,
        name: cost.nameSnapshot,
        amount: cost.amount,
        currency: cost.currency,
      })),
      incoterm,
      sellingPrice: 0,
      viewCurrency: item.marketId?.currencyCode || "USD",
      rates,
      components,
    });
    return serializeCorridor(
      item,
      {
        comparison: {
          totalCost: result.landedCost,
          freight: (item.costs || []).find((cost) => cost.componentCode === "freight")?.amount || 0,
          inlandTransport: (item.costs || []).find((cost) => cost.componentCode === "inland_transport")?.amount || 0,
          portCharges: (item.costs || []).find((cost) => cost.componentCode === "port_charges")?.amount || 0,
          handling: (item.costs || []).find((cost) => cost.componentCode === "export_handling")?.amount || 0,
          insurance: (item.costs || []).find((cost) => cost.componentCode === "insurance")?.amount || 0,
          duties: (item.costs || []).find((cost) => cost.componentCode === "duties")?.amount || 0,
          transitTime: item.transitAvgDays,
          reliability: item.reliability,
          capacity: item.capacity,
          risk: item.riskScore,
          score: item.corridorScore,
        },
      },
      finance
    );
  });

  return {
    profile: profile ? { id: String(profile._id), name: profile.name, factors: profile.factors, thresholds: profile.thresholds } : null,
    items: compared,
  };
}

async function listPerformance(corridorId, query = {}, req) {
  const { page, limit, skip } = parsePagination(query);
  const filter = notDeleted({ corridorId });
  const [items, total] = await Promise.all([
    ExportCorridorPerformance.find(filter).sort({ periodStart: -1 }).skip(skip).limit(limit).lean(),
    ExportCorridorPerformance.countDocuments(filter),
  ]);
  return { items: items.map((item) => serializePerformance(item, hideFinance(req))), pagination: paginationMeta({ page, limit, total }) };
}

async function createPerformance(corridorId, payload, actor, req) {
  const corridor = await ExportCorridor.findOne(notDeleted({ _id: corridorId }));
  if (!corridor) throw ApiError.notFound("Corridor not found");
  const item = await ExportCorridorPerformance.create({ ...payload, corridorId, ...stamp(actor, true) });
  await auditService.log({ actor, action: "create", module: "export-performance", resourceType: "ExportCorridorPerformance", resourceId: item._id, req });
  return serializePerformance(item, hideFinance(req));
}

async function updatePerformance(corridorId, performanceId, payload, actor, req) {
  const item = await ExportCorridorPerformance.findOne(notDeleted({ _id: performanceId, corridorId }));
  if (!item) throw ApiError.notFound("Performance record not found");
  Object.assign(item, payload, stamp(actor));
  await item.save();
  await auditService.log({ actor, action: "update", module: "export-performance", resourceType: "ExportCorridorPerformance", resourceId: item._id, req });
  return serializePerformance(item, hideFinance(req));
}

async function removePerformance(corridorId, performanceId, actor, req) {
  const item = await ExportCorridorPerformance.findOne(notDeleted({ _id: performanceId, corridorId }));
  if (!item) throw ApiError.notFound("Performance record not found");
  item.deletedAt = new Date();
  await item.save();
  await auditService.log({ actor, action: "delete", module: "export-performance", resourceType: "ExportCorridorPerformance", resourceId: item._id, req });
}

module.exports = {
  listCorridors,
  getCorridor,
  createCorridor,
  updateCorridor,
  removeCorridor,
  scoreCorridor,
  compareCorridors,
  listPerformance,
  createPerformance,
  updatePerformance,
  removePerformance,
};

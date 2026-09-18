const ExportMarket = require("../../models/ExportMarket");
const ExportCorridor = require("../../models/ExportCorridor");
const ExportOpportunity = require("../../models/ExportOpportunity");
const ExportRequirement = require("../../models/ExportRequirement");
const ExportBuyer = require("../../models/ExportBuyer");
const ExportAlert = require("../../models/ExportAlert");
const ExportAlertRule = require("../../models/ExportAlertRule");
const ExportCorridorPerformance = require("../../models/ExportCorridorPerformance");
const Role = require("../../models/Role");
const User = require("../../models/User");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta } = require("../../utils/pagination");
const { serializeAlert, serializeAlertRule } = require("../../utils/exportSerializer");
const auditService = require("../audit/audit.service");
const notificationService = require("../notifications/notification.service");
const { notDeleted, stamp, hideFinance } = require("./export.helpers");
const { deriveRequirementStatus } = require("./compliance.service");
const ExportSettings = require("../../models/ExportSettings");

async function dashboard(req) {
  const settings = await ExportSettings.findOne({ key: "export" }).lean();
  const expiryDays = settings?.requirementExpiryDays || 30;
  const soon = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  const [marketByStatus, corridorByStatus, opportunities, buyers, highRiskMarkets, highRiskCorridors, pendingCompliance, expiring, alerts] =
    await Promise.all([
      ExportMarket.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      ExportCorridor.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      ExportOpportunity.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: "$stage", count: { $sum: 1 }, revenue: { $sum: "$expectedRevenue" }, margin: { $avg: "$expectedMargin" } } },
      ]),
      ExportBuyer.countDocuments(notDeleted({ status: { $in: ["active", "prospect"] } })),
      ExportMarket.countDocuments(notDeleted({ riskScore: { $gte: 70 } })),
      ExportCorridor.countDocuments(notDeleted({ riskScore: { $gte: 70 } })),
      ExportRequirement.countDocuments(notDeleted({ status: { $in: ["pending", "draft"] } })),
      ExportRequirement.countDocuments(notDeleted({ expiryDate: { $ne: null, $lte: soon } })),
      ExportAlert.find().sort({ createdAt: -1 }).limit(8).lean(),
    ]);

  const marketStatus = Object.fromEntries(marketByStatus.map((row) => [row._id, row.count]));
  const corridorStatus = Object.fromEntries(corridorByStatus.map((row) => [row._id, row.count]));
  const opp = Object.fromEntries(opportunities.map((row) => [row._id, row]));
  const expectedRevenue = opportunities.reduce((sum, row) => sum + (row.revenue || 0), 0);
  const avgMargin = opportunities.length
    ? opportunities.reduce((sum, row) => sum + (row.margin || 0), 0) / opportunities.length
    : 0;
  const finance = hideFinance(req);

  const payload = {
    activeMarkets: marketStatus.active || 0,
    underEvaluation: marketStatus.under_evaluation || 0,
    activeCorridors: corridorStatus.active || 0,
    newOpportunities: opp.identified?.count || 0,
    activeBuyers: buyers,
    highRiskMarkets,
    highRiskCorridors,
    pendingCompliance,
    expiringRequirements: expiring,
    marketStatus,
    corridorStatus,
    opportunityStages: opportunities.map((row) => ({ stage: row._id, count: row.count, revenue: finance ? undefined : row.revenue })),
    expectedRevenue: finance ? undefined : expectedRevenue,
    averageMargin: finance ? undefined : Math.round(avgMargin * 100) / 100,
    alerts: alerts.map(serializeAlert),
  };

  const transit = await ExportCorridor.aggregate([
    { $match: { deletedAt: null, status: "active" } },
    { $group: { _id: null, avg: { $avg: "$transitAvgDays" } } },
  ]);
  payload.averageTransitTime = Math.round((transit[0]?.avg || 0) * 10) / 10;
  return payload;
}

async function analytics(query = {}, req) {
  const match = { deletedAt: null };
  if (query.marketId) match.marketId = query.marketId;
  if (query.productId) match.productId = query.productId;
  if (query.buyerId) match.buyerId = query.buyerId;
  if (query.corridorId) match.corridorId = query.corridorId;
  if (query.status) match.stage = query.status;
  if (query.from || query.to) {
    match.createdAt = {};
    if (query.from) match.createdAt.$gte = new Date(query.from);
    if (query.to) match.createdAt.$lte = new Date(query.to);
  }

  const marketMatch = { deletedAt: null };
  if (query.country) marketMatch.countryCode = String(query.country).toUpperCase();
  if (query.region) marketMatch.regionCode = String(query.region).toUpperCase();
  if (query.marketId) marketMatch._id = query.marketId;

  const [byMarket, byStage, corridors, performance] = await Promise.all([
    ExportOpportunity.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$marketId",
          expectedRevenue: { $sum: "$expectedRevenue" },
          expectedVolume: { $sum: "$expectedVolume" },
          avgMargin: { $avg: "$expectedMargin" },
          count: { $sum: 1 },
        },
      },
    ]),
    ExportOpportunity.aggregate([{ $match: match }, { $group: { _id: "$stage", count: { $sum: 1 }, revenue: { $sum: "$expectedRevenue" } } }]),
    ExportCorridor.aggregate([
      { $match: { deletedAt: null, ...(query.marketId ? { marketId: query.marketId } : {}) } },
      { $group: { _id: "$primaryMode", count: { $sum: 1 }, avgTransit: { $avg: "$transitAvgDays" }, avgScore: { $avg: "$corridorScore" } } },
    ]),
    ExportCorridorPerformance.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: "$corridorId",
          avgActualTransit: { $avg: "$actualTransitDays" },
          avgActualCost: { $avg: "$actualCost" },
          avgOtd: { $avg: "$onTimeDeliveryPct" },
          volume: { $sum: "$shipmentVolume" },
          revenue: { $sum: "$revenue" },
        },
      },
    ]),
  ]);

  const marketIds = byMarket.map((row) => row._id).filter(Boolean);
  const markets = await ExportMarket.find({ _id: { $in: marketIds }, ...marketMatch }).select("name countryCode regionCode status").lean();
  const marketMap = Object.fromEntries(markets.map((item) => [String(item._id), item]));
  const finance = hideFinance(req);

  return {
    revenueByMarket: byMarket
      .filter((row) => marketMap[String(row._id)])
      .map((row) => ({
        marketId: String(row._id),
        name: marketMap[String(row._id)]?.name,
        countryCode: marketMap[String(row._id)]?.countryCode,
        expectedRevenue: finance ? undefined : row.expectedRevenue,
        expectedVolume: row.expectedVolume,
        avgMargin: finance ? undefined : Math.round((row.avgMargin || 0) * 100) / 100,
        count: row.count,
      })),
    opportunitiesByStage: byStage.map((row) => ({ stage: row._id, count: row.count, revenue: finance ? undefined : row.revenue })),
    corridorsByMode: corridors,
    corridorPerformance: finance
      ? performance.map((row) => ({
          corridorId: String(row._id),
          avgActualTransit: row.avgActualTransit,
          avgOtd: row.avgOtd,
          volume: row.volume,
        }))
      : performance.map((row) => ({ ...row, corridorId: String(row._id) })),
  };
}

async function listAlerts(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.unread === "true") filter.readAt = null;
  if (query.eventType) filter.eventType = query.eventType;
  const [items, total] = await Promise.all([
    ExportAlert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ExportAlert.countDocuments(filter),
  ]);
  return { items: items.map(serializeAlert), pagination: paginationMeta({ page, limit, total }) };
}

async function markAlertRead(id) {
  const item = await ExportAlert.findByIdAndUpdate(id, { readAt: new Date() }, { new: true }).lean();
  if (!item) throw ApiError.notFound("Alert not found");
  return serializeAlert(item);
}

async function listAlertRules(query = {}) {
  const filter = notDeleted();
  if (query.eventType) filter.eventType = query.eventType;
  const items = await ExportAlertRule.find(filter).sort({ createdAt: -1 }).lean();
  return { items: items.map(serializeAlertRule) };
}

async function createAlertRule(payload, actor, req) {
  const item = await ExportAlertRule.create({ ...payload, ...stamp(actor, true) });
  await auditService.log({ actor, action: "create", module: "export-alerts", resourceType: "ExportAlertRule", resourceId: item._id, req });
  return serializeAlertRule(item);
}

async function updateAlertRule(id, payload, actor, req) {
  const item = await ExportAlertRule.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Alert rule not found");
  Object.assign(item, payload, stamp(actor));
  await item.save();
  await auditService.log({ actor, action: "update", module: "export-alerts", resourceType: "ExportAlertRule", resourceId: item._id, req });
  return serializeAlertRule(item);
}

async function removeAlertRule(id, actor, req) {
  const item = await ExportAlertRule.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Alert rule not found");
  item.deletedAt = new Date();
  await item.save();
  await auditService.log({ actor, action: "delete", module: "export-alerts", resourceType: "ExportAlertRule", resourceId: item._id, req });
}

async function recipientsFor(rule) {
  const ids = new Set((rule.userIds || []).map((id) => String(id)));
  if (rule.notifyRoleSlugs?.length) {
    const roles = await Role.find({ slug: { $in: rule.notifyRoleSlugs }, deletedAt: null }).select("_id").lean();
    const users = await User.find(notDeleted({ roleIds: { $in: roles.map((role) => role._id) }, status: "active" }))
      .select("_id")
      .lean();
    users.forEach((user) => ids.add(String(user._id)));
  }
  return [...ids];
}

async function emitAlert({ rule, eventType, title, body, resourceType, resourceId, severity = "warning", data = {} }) {
  const dedupeKey = `${eventType}:${resourceType}:${resourceId}:${new Date().toISOString().slice(0, 10)}`;
  const existing = await ExportAlert.findOne({ dedupeKey, createdAt: { $gte: new Date(Date.now() - 20 * 60 * 60 * 1000) } });
  if (existing) return existing;
  const alert = await ExportAlert.create({
    ruleId: rule?._id || null,
    eventType,
    title,
    body,
    resourceType,
    resourceId: resourceId ? String(resourceId) : "",
    severity,
    dedupeKey,
    data,
  });
  if (rule) {
    const recipients = await recipientsFor(rule);
    await Promise.all(
      recipients.map((userId) =>
        notificationService.create({
          userId,
          type: "export_alert",
          title,
          body,
          data: { alertId: String(alert._id), resourceType, resourceId },
        })
      )
    );
    await ExportAlertRule.updateOne({ _id: rule._id }, { $set: { lastFiredAt: new Date() } });
  }
  return alert;
}

async function processExportAlerts() {
  const settings = await ExportSettings.findOne({ key: "export" }).lean();
  const expiryDays = settings?.requirementExpiryDays || 30;
  const soon = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const rules = await ExportAlertRule.find(notDeleted({ enabled: true })).lean();
  const byType = Object.fromEntries(rules.map((rule) => [rule.eventType, rule]));
  let created = 0;

  const requirements = await ExportRequirement.find(notDeleted({ expiryDate: { $ne: null, $lte: soon } })).limit(100).lean();
  for (const item of requirements) {
    const status = deriveRequirementStatus(item, expiryDays);
    const eventType = status === "expired" ? "requirement_expired" : "requirement_expiring";
    const rule = byType[eventType];
    if (!rule && eventType === "requirement_expired" && !byType.requirement_expiring) continue;
    const used = rule || byType.requirement_expiring;
    if (!used) continue;
    await emitAlert({
      rule: used,
      eventType,
      title: used.titleTemplate || `${item.name} ${status}`,
      body: used.bodyTemplate || `Requirement ${item.name} is ${status}.`,
      resourceType: "ExportRequirement",
      resourceId: item._id,
      data: { marketId: String(item.marketId) },
    });
    created += 1;
  }

  const restricted = await ExportMarket.find(notDeleted({ status: { $in: ["restricted", "suspended"] } })).limit(50).lean();
  for (const market of restricted) {
    const rule = byType.market_status_restricted;
    if (!rule) continue;
    await emitAlert({
      rule,
      eventType: "market_status_restricted",
      title: rule.titleTemplate || `${market.name} is ${market.status}`,
      body: rule.bodyTemplate || `Market ${market.name} is ${market.status}.`,
      resourceType: "ExportMarket",
      resourceId: market._id,
      severity: "critical",
    });
    created += 1;
  }

  const unavailable = await ExportCorridor.find(notDeleted({ status: "unavailable" })).limit(50).lean();
  for (const corridor of unavailable) {
    const rule = byType.corridor_unavailable;
    if (!rule) continue;
    await emitAlert({
      rule,
      eventType: "corridor_unavailable",
      title: rule.titleTemplate || `${corridor.name} is unavailable`,
      body: rule.bodyTemplate || `Corridor ${corridor.name} is unavailable.`,
      resourceType: "ExportCorridor",
      resourceId: corridor._id,
    });
    created += 1;
  }

  const overdue = await ExportOpportunity.find(
    notDeleted({
      nextActionAt: { $ne: null, $lt: now },
      stage: { $nin: ["converted", "lost"] },
    })
  )
    .limit(50)
    .lean();
  for (const item of overdue) {
    const rule = byType.opportunity_overdue;
    if (!rule) continue;
    await emitAlert({
      rule,
      eventType: "opportunity_overdue",
      title: rule.titleTemplate || `${item.title} is overdue`,
      body: rule.bodyTemplate || item.nextAction || "Opportunity next action is overdue.",
      resourceType: "ExportOpportunity",
      resourceId: item._id,
    });
    created += 1;
  }

  return created;
}

module.exports = {
  dashboard,
  analytics,
  listAlerts,
  markAlertRead,
  listAlertRules,
  createAlertRule,
  updateAlertRule,
  removeAlertRule,
  emitAlert,
  processExportAlerts,
};

const ExportPricing = require("../../models/ExportPricing");
const ExportProduct = require("../../models/ExportProduct");
const ExportMarket = require("../../models/ExportMarket");
const ExportCorridor = require("../../models/ExportCorridor");
const ExportBuyer = require("../../models/ExportBuyer");
const ExportIncoterm = require("../../models/ExportIncoterm");
const ExportLookup = require("../../models/ExportLookup");
const ExportCostEstimate = require("../../models/ExportCostEstimate");
const ExportOpportunity = require("../../models/ExportOpportunity");
const ExportSettings = require("../../models/ExportSettings");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializePricing } = require("../../utils/exportSerializer");
const auditService = require("../audit/audit.service");
const { calculateLandedCost } = require("./engines/landedCost.engine");
const { loadFxRates } = require("./config.service");
const { notDeleted, stamp, hideFinance } = require("./export.helpers");

function isEffective(item, at, qty) {
  if (item.status && item.status !== "active") return false;
  if (item.effectiveFrom && new Date(item.effectiveFrom) > at) return false;
  if (item.effectiveUntil && new Date(item.effectiveUntil) < at) return false;
  if (qty != null) {
    if (item.volumeMin && qty < item.volumeMin) return false;
    if (item.volumeMax && qty > item.volumeMax) return false;
  }
  return true;
}

async function listPricing(query = {}, req) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "targetPrice", "status"]);
  const filter = notDeleted();
  if (query.marketId) filter.marketId = query.marketId;
  if (query.productId) filter.productId = query.productId;
  if (query.buyerId) filter.buyerId = query.buyerId;
  if (query.status) filter.status = query.status;
  if (query.pricingType) filter.pricingType = query.pricingType;
  const [items, total] = await Promise.all([
    ExportPricing.find(filter)
      .populate("productId", "name sku")
      .populate("marketId", "name countryCode")
      .populate("buyerId", "name")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    ExportPricing.countDocuments(filter),
  ]);
  return { items: items.map((item) => serializePricing(item, hideFinance(req))), pagination: paginationMeta({ page, limit, total }) };
}

async function createPricing(payload, actor, req) {
  const item = await ExportPricing.create({ ...payload, ...stamp(actor, true) });
  await auditService.log({ actor, action: "create", module: "export-pricing", resourceType: "ExportPricing", resourceId: item._id, req });
  const hydrated = await ExportPricing.findById(item._id).populate("productId", "name sku").populate("marketId", "name countryCode").populate("buyerId", "name").lean();
  return serializePricing(hydrated, hideFinance(req));
}

async function updatePricing(id, payload, actor, req) {
  const item = await ExportPricing.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Pricing record not found");
  Object.assign(item, payload, stamp(actor));
  await item.save();
  await auditService.log({ actor, action: "update", module: "export-pricing", resourceType: "ExportPricing", resourceId: item._id, req });
  const hydrated = await ExportPricing.findById(item._id).populate("productId", "name sku").populate("marketId", "name countryCode").populate("buyerId", "name").lean();
  return serializePricing(hydrated, hideFinance(req));
}

async function removePricing(id, actor, req) {
  const item = await ExportPricing.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Pricing record not found");
  item.deletedAt = new Date();
  await item.save();
  await auditService.log({ actor, action: "delete", module: "export-pricing", resourceType: "ExportPricing", resourceId: item._id, req });
}

async function resolvePrice({ productId, marketId, buyerId, quantity, at = new Date() }) {
  const records = await ExportPricing.find(notDeleted({ productId, marketId, status: "active" })).lean();
  const ranked = records
    .filter((item) => isEffective(item, at, quantity))
    .sort((a, b) => {
      const aBuyer = a.buyerId && String(a.buyerId) === String(buyerId) ? 0 : 1;
      const bBuyer = b.buyerId && String(b.buyerId) === String(buyerId) ? 0 : 1;
      if (aBuyer !== bBuyer) return aBuyer - bBuyer;
      return Number(b.volumeMin || 0) - Number(a.volumeMin || 0);
    });
  return ranked[0] || null;
}

async function calculate(payload, actor, req) {
  const quantity = Number(payload.quantity || 1);
  const product = payload.productId ? await ExportProduct.findOne(notDeleted({ _id: payload.productId })).lean() : null;
  const market = payload.marketId ? await ExportMarket.findOne(notDeleted({ _id: payload.marketId })).lean() : null;
  const corridor = payload.corridorId ? await ExportCorridor.findOne(notDeleted({ _id: payload.corridorId })).lean() : null;
  const settings = (await ExportSettings.findOne({ key: "export" }).lean()) || { baseCurrency: "INR", defaultIncoterm: "FOB" };
  const incotermCode = String(payload.incotermCode || corridor && "CIF" || settings.defaultIncoterm || "FOB").toUpperCase();
  const incoterm = await ExportIncoterm.findOne(notDeleted({ code: incotermCode })).lean();
  if (!incoterm) throw ApiError.validation({ incotermCode: "Unknown incoterm" });
  const components = await ExportLookup.find(notDeleted({ type: "cost_component", status: "active" })).sort({ sortOrder: 1 }).lean();
  const rates = await loadFxRates();
  const viewCurrency = String(payload.currency || market?.currencyCode || settings.baseCurrency || "INR").toUpperCase();

  const pricing = product && market ? await resolvePrice({ productId: product._id, marketId: market._id, buyerId: payload.buyerId, quantity }) : null;
  const unitPrice = Number(payload.unitPrice ?? product?.baseCost ?? 0);
  const sellingPrice = Number(payload.sellingPrice ?? pricing?.targetPrice ?? unitPrice * quantity);

  const provided = payload.lines || [];
  const fromCorridor = (corridor?.costs || []).map((cost) => ({
    componentCode: cost.componentCode,
    name: cost.nameSnapshot,
    amount: cost.amount,
    currency: cost.currency,
  }));
  const productLine = product
    ? [{ componentCode: "product_cost", name: "Product cost", amount: unitPrice * quantity, currency: product.baseCurrency || settings.baseCurrency }]
    : [];
  const merged = {};
  [...productLine, ...fromCorridor, ...provided].forEach((line) => {
    merged[line.componentCode] = line;
  });
  const lines = Object.values(merged);

  const result = calculateLandedCost({
    lines,
    incoterm,
    sellingPrice,
    viewCurrency,
    rates,
    components,
  });

  const snapshot = {
    ...result,
    quantity,
    unitPrice,
    productId: product ? String(product._id) : null,
    marketId: market ? String(market._id) : null,
    corridorId: corridor ? String(corridor._id) : null,
    buyerId: payload.buyerId || null,
    hideFinance: hideFinance(req),
  };

  if (payload.save && actor) {
    const estimate = await ExportCostEstimate.create({
      productId: product?._id,
      marketId: market?._id,
      corridorId: corridor?._id,
      buyerId: payload.buyerId || null,
      opportunityId: payload.opportunityId || null,
      quantity,
      unitPrice,
      sellingPrice,
      incotermCode,
      currency: viewCurrency,
      lines: result.lines,
      landedCost: result.landedCost,
      grossProfit: result.grossProfit,
      grossMarginPct: result.grossMarginPct,
      createdBy: actor._id,
    });
    snapshot.estimateId = String(estimate._id);
    if (payload.opportunityId) {
      await ExportOpportunity.updateOne({ _id: payload.opportunityId, deletedAt: null }, { $set: { landedCostSnapshot: snapshot } });
    }
    await auditService.log({ actor, action: "calculate", module: "export-calculator", resourceType: "ExportCostEstimate", resourceId: estimate._id, req });
  }

  if (hideFinance(req)) {
    delete snapshot.grossProfit;
    delete snapshot.grossMarginPct;
    delete snapshot.sellingPrice;
  }
  return snapshot;
}

module.exports = {
  listPricing,
  createPricing,
  updatePricing,
  removePricing,
  resolvePrice,
  calculate,
};

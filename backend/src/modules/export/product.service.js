const Product = require("../../models/Product");
const ExportMarketProduct = require("../../models/ExportMarketProduct");
const ExportMarket = require("../../models/ExportMarket");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta } = require("../../utils/pagination");
const { serializeMapping } = require("../../utils/exportSerializer");
const auditService = require("../audit/audit.service");
const { notDeleted, stamp } = require("./export.helpers");

async function listMappings(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = notDeleted();
  if (query.marketId) filter.marketId = query.marketId;
  if (query.productId) filter.productId = query.productId;
  if (query.eligibilityStatus) filter.eligibilityStatus = query.eligibilityStatus;
  const [items, total] = await Promise.all([
    ExportMarketProduct.find(filter)
      .populate("productId", "name sku hsCode")
      .populate("marketId", "name countryCode")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ExportMarketProduct.countDocuments(filter),
  ]);
  return { items: items.map(serializeMapping), pagination: paginationMeta({ page, limit, total }) };
}

async function createMapping(marketId, payload, actor, req) {
  const market = await ExportMarket.findOne(notDeleted({ _id: marketId }));
  if (!market) throw ApiError.notFound("Market not found");
  const product = await Product.findOne(notDeleted({ _id: payload.productId }));
  if (!product) throw ApiError.notFound("Product not found");
  if (product.listingStatus !== "listed") {
    throw ApiError.badRequest("Only listed catalog products can be mapped to a market", { productId: "Product must be listed" });
  }
  const existing = await ExportMarketProduct.findOne(notDeleted({ marketId, productId: payload.productId }));
  if (existing) throw ApiError.conflict("Product is already mapped to this market", { productId: "Already mapped" });
  const item = await ExportMarketProduct.create({
    ...payload,
    marketId,
    hsCode: payload.hsCode || product.hsCode,
    currency: payload.currency || market.currencyCode,
    ...stamp(actor, true),
  });
  await auditService.log({ actor, action: "create", module: "export-mappings", resourceType: "ExportMarketProduct", resourceId: item._id, req });
  const hydrated = await ExportMarketProduct.findById(item._id).populate("productId", "name sku hsCode").populate("marketId", "name countryCode").lean();
  return serializeMapping(hydrated);
}

async function updateMapping(marketId, mappingId, payload, actor, req) {
  const item = await ExportMarketProduct.findOne(notDeleted({ _id: mappingId, marketId }));
  if (!item) throw ApiError.notFound("Mapping not found");
  Object.assign(item, payload, stamp(actor));
  await item.save();
  await auditService.log({ actor, action: "update", module: "export-mappings", resourceType: "ExportMarketProduct", resourceId: item._id, req });
  const hydrated = await ExportMarketProduct.findById(item._id).populate("productId", "name sku hsCode").populate("marketId", "name countryCode").lean();
  return serializeMapping(hydrated);
}

async function removeMapping(marketId, mappingId, actor, req) {
  const item = await ExportMarketProduct.findOne(notDeleted({ _id: mappingId, marketId }));
  if (!item) throw ApiError.notFound("Mapping not found");
  item.deletedAt = new Date();
  await item.save();
  await auditService.log({ actor, action: "delete", module: "export-mappings", resourceType: "ExportMarketProduct", resourceId: item._id, req });
}

module.exports = {
  listMappings,
  createMapping,
  updateMapping,
  removeMapping,
};

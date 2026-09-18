const ExportProduct = require("../../models/ExportProduct");
const ExportMarketProduct = require("../../models/ExportMarketProduct");
const ExportMarket = require("../../models/ExportMarket");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializeProduct, serializeMapping } = require("../../utils/exportSerializer");
const auditService = require("../audit/audit.service");
const { notDeleted, cleanOwner, stamp, hideFinance } = require("./export.helpers");
const { OWNER_SELECT } = require("./config.service");

async function listProducts(query = {}, req) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "name", "sku", "status"]);
  const filter = notDeleted();
  if (query.status) filter.status = query.status;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { sku: { $regex: query.search, $options: "i" } },
      { hsCode: { $regex: query.search, $options: "i" } },
      { category: { $regex: query.search, $options: "i" } },
    ];
  }
  const [items, total] = await Promise.all([
    ExportProduct.find(filter).populate("ownerId", OWNER_SELECT).sort(sort).skip(skip).limit(limit).lean(),
    ExportProduct.countDocuments(filter),
  ]);
  const finance = hideFinance(req);
  return { items: items.map((item) => serializeProduct(item, finance)), pagination: paginationMeta({ page, limit, total }) };
}

async function getProduct(id, req) {
  const item = await ExportProduct.findOne(notDeleted({ _id: id })).populate("ownerId", OWNER_SELECT).lean();
  if (!item) throw ApiError.notFound("Product not found");
  return serializeProduct(item, hideFinance(req));
}

async function createProduct(payload, actor, req) {
  const item = await ExportProduct.create({
    ...payload,
    ownerId: cleanOwner(payload.ownerId) || actor._id,
    ...stamp(actor, true),
  });
  await auditService.log({ actor, action: "create", module: "export-products", resourceType: "ExportProduct", resourceId: item._id, req });
  return getProduct(item._id, req);
}

async function updateProduct(id, payload, actor, req) {
  const item = await ExportProduct.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Product not found");
  Object.assign(item, payload, stamp(actor));
  if (payload.ownerId !== undefined) item.ownerId = cleanOwner(payload.ownerId);
  await item.save();
  await auditService.log({ actor, action: "update", module: "export-products", resourceType: "ExportProduct", resourceId: item._id, req });
  return getProduct(item._id, req);
}

async function removeProduct(id, actor, req) {
  const item = await ExportProduct.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Product not found");
  item.deletedAt = new Date();
  await item.save();
  await ExportMarketProduct.updateMany({ productId: item._id, deletedAt: null }, { $set: { deletedAt: new Date() } });
  await auditService.log({ actor, action: "delete", module: "export-products", resourceType: "ExportProduct", resourceId: item._id, req });
}

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
  const product = await ExportProduct.findOne(notDeleted({ _id: payload.productId }));
  if (!product) throw ApiError.notFound("Product not found");
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
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  removeProduct,
  listMappings,
  createMapping,
  updateMapping,
  removeMapping,
};

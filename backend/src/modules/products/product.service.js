const Product = require("../../models/Product");
const ProductShare = require("../../models/ProductShare");
const Lead = require("../../models/Lead");
const ExportBuyer = require("../../models/ExportBuyer");
const ExportMarketProduct = require("../../models/ExportMarketProduct");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializeProduct, serializeShare, serializeSupplier } = require("../../utils/productSerializer");
const auditService = require("../audit/audit.service");
const notificationService = require("../notifications/notification.service");
const { migrateExportProducts } = require("./product.migrate");

const OWNER_SELECT = "name email avatarUrl";
const SUPPLIER_SELECT = "name legalName stage email verificationStatus country city ownerId";

function notDeleted(extra = {}) {
  return { deletedAt: null, ...extra };
}

function cleanId(value) {
  if (value === undefined) return undefined;
  if (value === "" || value === null) return null;
  return value;
}

function stamp(actor, isCreate = false) {
  const next = { updatedBy: actor?._id || null };
  if (isCreate) next.createdBy = actor?._id || null;
  return next;
}

function hasPermission(req, name) {
  if (req?.isSuperAdmin) return true;
  return (req?.permissions || []).includes(name);
}

function hideFinance(req) {
  return !hasPermission(req, "export.finance.view");
}

function regex(value) {
  return { $regex: value, $options: "i" };
}

function cleanTags(tags) {
  if (!Array.isArray(tags)) return undefined;
  return [...new Set(tags.map((item) => String(item || "").trim()).filter(Boolean))];
}

function primaryUnit(payload) {
  if (payload.unit) return payload.unit;
  const first = (payload.measurements || []).find((item) => item?.unit);
  return first?.unit || "unit";
}

function applyCommercial(item, payload) {
  if (payload.indicativePrice !== undefined) {
    item.indicativePrice = Number(payload.indicativePrice) || 0;
    item.baseCost = item.indicativePrice;
  }
  if (payload.currency !== undefined) {
    item.currency = String(payload.currency || "INR").toUpperCase();
    item.baseCurrency = item.currency;
  }
  if (payload.sku !== undefined) item.sku = String(payload.sku || "").trim().toUpperCase();
  if (payload.hsCode !== undefined) item.hsCode = payload.hsCode;
  if (payload.unit !== undefined) item.unit = payload.unit || primaryUnit(payload);
  else if (payload.measurements) item.unit = primaryUnit(payload);
}

function canEditCatalog(item) {
  return ["draft", "rejected", "verified", "in_verification"].includes(item.status);
}

async function loadAssignableSupplier(supplierId) {
  const lead = await Lead.findOne(notDeleted({ _id: supplierId }));
  if (!lead) throw ApiError.notFound("Supplier not found");
  if (lead.stage !== "won") {
    throw ApiError.badRequest("Only won suppliers can have catalog products", { supplierId: "Supplier must be won" });
  }
  if (lead.verificationStatus !== "verified") {
    throw ApiError.badRequest("Only verified suppliers can have catalog products", { supplierId: "Supplier must be verified" });
  }
  return lead;
}

async function hydrate(item, req, extras = {}) {
  const populated =
    item.supplierId && typeof item.supplierId === "object" && item.supplierId.name
      ? item
      : await Product.findById(item._id)
          .populate("supplierId", SUPPLIER_SELECT)
          .populate("ownerId", OWNER_SELECT)
          .populate("listedBy", OWNER_SELECT)
          .lean();
  return serializeProduct(populated, extras, hideFinance(req));
}

async function list(query = {}, req) {
  await migrateExportProducts();
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "name", "sku", "status", "listingStatus", "updatedAt"]);
  const filter = notDeleted();
  if (query.supplierId) filter.supplierId = query.supplierId;
  if (query.status) filter.status = query.status;
  if (query.listingStatus) filter.listingStatus = query.listingStatus;
  if (query.verificationStatus) filter.verificationStatus = query.verificationStatus;
  if (query.category) filter.category = regex(query.category);
  if (query.origin) filter.origin = query.origin;
  if (query.search) {
    filter.$or = [
      { name: regex(query.search) },
      { sku: regex(query.search) },
      { hsCode: regex(query.search) },
      { category: regex(query.search) },
      { brand: regex(query.search) },
      { tags: regex(query.search) },
    ];
  }
  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate("supplierId", SUPPLIER_SELECT)
      .populate("ownerId", OWNER_SELECT)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);
  return {
    items: items.map((item) => serializeProduct(item, {}, hideFinance(req))),
    pagination: paginationMeta({ page, limit, total }),
  };
}

async function getById(id, req) {
  const item = await Product.findOne(notDeleted({ _id: id }))
    .populate("supplierId", SUPPLIER_SELECT)
    .populate("ownerId", OWNER_SELECT)
    .populate("listedBy", OWNER_SELECT)
    .lean();
  if (!item) throw ApiError.notFound("Product not found");
  const shares = await ProductShare.find(notDeleted({ productId: item._id, status: "shared" }))
    .populate("buyerId", "name country status")
    .populate("sharedBy", OWNER_SELECT)
    .sort({ sharedAt: -1 })
    .lean();
  return hydrate(item, req, {
    shares: shares.map((share) => serializeShare(share)),
  });
}

async function create(payload, actor, req) {
  const supplier = await loadAssignableSupplier(payload.supplierId);
  const item = new Product({
    supplierId: supplier._id,
    name: payload.name,
    brand: payload.brand || "",
    originCountry: payload.originCountry || "",
    category: payload.category || "",
    tags: cleanTags(payload.tags) || [],
    identifiers: payload.identifiers || {},
    measurements: payload.measurements || [],
    attributes: payload.attributes || [],
    description: payload.description || "",
    highlights: (payload.highlights || []).filter(Boolean),
    packagingNotes: payload.packagingNotes || "",
    moq: payload.moq || { value: 0, unit: "" },
    leadTimeDays: payload.leadTimeDays || 0,
    incotermCode: payload.incotermCode || "",
    media: payload.media || [],
    notes: payload.notes || "",
    customFields: payload.customFields || {},
    ownerId: cleanId(payload.ownerId) || actor._id,
    origin: "catalog",
    status: "draft",
    listingStatus: "unlisted",
    ...stamp(actor, true),
  });
  applyCommercial(item, payload);
  await item.save();
  await auditService.log({
    actor,
    action: "create",
    module: "products",
    resourceType: "Product",
    resourceId: item._id,
    req,
    metadata: { supplierId: String(supplier._id) },
  });
  return getById(item._id, req);
}

async function update(id, payload, actor, req) {
  const item = await Product.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Product not found");
  if (item.status === "archived") throw ApiError.conflict("Archived products cannot be edited");
  if (!canEditCatalog(item)) throw ApiError.conflict("This product cannot be edited");
  if (payload.supplierId && String(payload.supplierId) !== String(item.supplierId || "")) {
    if (item.origin !== "migrated" && item.listingStatus === "listed") {
      throw ApiError.conflict("Unlist the product before changing its supplier");
    }
    const supplier = await loadAssignableSupplier(payload.supplierId);
    item.supplierId = supplier._id;
  }
  const assignable = [
    "name",
    "brand",
    "originCountry",
    "category",
    "identifiers",
    "measurements",
    "attributes",
    "description",
    "packagingNotes",
    "moq",
    "leadTimeDays",
    "incotermCode",
    "media",
    "notes",
    "customFields",
  ];
  for (const key of assignable) {
    if (payload[key] !== undefined) item[key] = payload[key];
  }
  if (payload.tags !== undefined) item.tags = cleanTags(payload.tags);
  if (payload.highlights !== undefined) item.highlights = (payload.highlights || []).filter(Boolean);
  if (payload.ownerId !== undefined) item.ownerId = cleanId(payload.ownerId);
  applyCommercial(item, payload);
  Object.assign(item, stamp(actor));
  await item.save();
  await auditService.log({ actor, action: "update", module: "products", resourceType: "Product", resourceId: item._id, req });
  return getById(item._id, req);
}

async function remove(id, actor, req) {
  const item = await Product.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Product not found");
  item.deletedAt = new Date();
  item.listingStatus = "unlisted";
  Object.assign(item, stamp(actor));
  await item.save();
  await ExportMarketProduct.updateMany({ productId: item._id, deletedAt: null }, { $set: { deletedAt: new Date() } });
  await revokeOpenShares(item, actor, "Product deleted");
  await auditService.log({ actor, action: "delete", module: "products", resourceType: "Product", resourceId: item._id, req });
}

function canList(item) {
  return item.verificationStatus === "verified" || item.origin === "migrated";
}

async function listToCatalog(id, actor, req) {
  const item = await Product.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Product not found");
  if (item.status === "archived") throw ApiError.conflict("Archived products cannot be listed");
  if (!canList(item)) {
    throw ApiError.conflict("Verify the product before listing it in the catalog");
  }
  item.listingStatus = "listed";
  item.listedAt = new Date();
  item.listedBy = actor._id;
  if (item.status !== "archived" && item.verificationStatus === "verified") item.status = "verified";
  Object.assign(item, stamp(actor));
  await item.save();
  await auditService.log({ actor, action: "list", module: "products", resourceType: "Product", resourceId: item._id, req });
  return getById(item._id, req);
}

async function unlistFromCatalog(id, actor, req) {
  const item = await Product.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Product not found");
  item.listingStatus = "unlisted";
  Object.assign(item, stamp(actor));
  await item.save();
  await revokeOpenShares(item, actor, "Product unlisted");
  await auditService.log({ actor, action: "unlist", module: "products", resourceType: "Product", resourceId: item._id, req });
  return getById(item._id, req);
}

async function archive(id, actor, req) {
  const item = await Product.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Product not found");
  item.status = "archived";
  item.listingStatus = "unlisted";
  Object.assign(item, stamp(actor));
  await item.save();
  await revokeOpenShares(item, actor, "Product archived");
  await auditService.log({ actor, action: "archive", module: "products", resourceType: "Product", resourceId: item._id, req });
  return getById(item._id, req);
}

async function syncBuyerProductIds(buyerId) {
  const shares = await ProductShare.find(notDeleted({ buyerId, status: "shared" })).select("productId").lean();
  await ExportBuyer.updateOne({ _id: buyerId }, { $set: { productIds: shares.map((item) => item.productId) } });
}

async function revokeOpenShares(product, actor, note) {
  const open = await ProductShare.find(notDeleted({ productId: product._id, status: "shared" }));
  const buyerIds = new Set();
  for (const share of open) {
    share.status = "revoked";
    share.revokedAt = new Date();
    share.revokedBy = actor?._id || null;
    if (note && !share.note) share.note = note;
    await share.save();
    buyerIds.add(String(share.buyerId));
  }
  for (const buyerId of buyerIds) {
    await syncBuyerProductIds(buyerId);
  }
}

async function listShares(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = notDeleted();
  if (query.buyerId) filter.buyerId = query.buyerId;
  if (query.productId) filter.productId = query.productId;
  if (query.status) filter.status = query.status;
  else filter.status = "shared";
  const [items, total] = await Promise.all([
    ProductShare.find(filter)
      .populate({
        path: "productId",
        select: "name sku category listingStatus media supplierId",
        populate: { path: "supplierId", select: "name legalName stage verificationStatus" },
      })
      .populate("buyerId", "name country status")
      .populate("sharedBy", OWNER_SELECT)
      .sort({ sharedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ProductShare.countDocuments(filter),
  ]);
  return {
    items: items.map((item) =>
      serializeShare(item, {
        product: item.productId
          ? serializeProduct(item.productId, { supplier: serializeSupplier(item.productId.supplierId) }, true)
          : null,
      })
    ),
    pagination: paginationMeta({ page, limit, total }),
  };
}

async function shareWithBuyer(id, payload, actor, req) {
  const item = await Product.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Product not found");
  if (item.listingStatus !== "listed") throw ApiError.conflict("List the product before sharing it with distributors");
  const buyer = await ExportBuyer.findOne(notDeleted({ _id: payload.buyerId }));
  if (!buyer) throw ApiError.notFound("Distributor not found");
  const existing = await ProductShare.findOne(notDeleted({ productId: item._id, buyerId: buyer._id, status: "shared" }));
  if (existing) throw ApiError.conflict("This product is already shared with that distributor");
  const previous = await ProductShare.findOne(notDeleted({ productId: item._id, buyerId: buyer._id, status: "revoked" }));
  let share;
  if (previous) {
    previous.status = "shared";
    previous.note = payload.note || "";
    previous.sharedBy = actor._id;
    previous.sharedAt = new Date();
    previous.revokedAt = null;
    previous.revokedBy = null;
    await previous.save();
    share = previous;
  } else {
    share = await ProductShare.create({
      productId: item._id,
      buyerId: buyer._id,
      status: "shared",
      note: payload.note || "",
      sharedBy: actor._id,
      sharedAt: new Date(),
    });
  }
  await syncBuyerProductIds(buyer._id);
  if (buyer.ownerId && String(buyer.ownerId) !== String(actor._id)) {
    await notificationService.create({
      userId: buyer.ownerId,
      type: "product_shared",
      title: `Product shared: ${item.name}`,
      body: `${item.name} is now shared with ${buyer.name}.`,
      data: { productId: String(item._id), buyerId: String(buyer._id) },
    });
  }
  await auditService.log({
    actor,
    action: "share",
    module: "products",
    resourceType: "ProductShare",
    resourceId: share._id,
    req,
    metadata: { productId: String(item._id), buyerId: String(buyer._id) },
  });
  const hydrated = await ProductShare.findById(share._id).populate("buyerId", "name country status").populate("sharedBy", OWNER_SELECT).lean();
  return serializeShare(hydrated);
}

async function revokeShare(id, shareId, actor, req) {
  const item = await Product.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Product not found");
  const share = await ProductShare.findOne(notDeleted({ _id: shareId, productId: item._id }));
  if (!share) throw ApiError.notFound("Share not found");
  if (share.status !== "revoked") {
    share.status = "revoked";
    share.revokedAt = new Date();
    share.revokedBy = actor._id;
    await share.save();
    await syncBuyerProductIds(share.buyerId);
  }
  await auditService.log({
    actor,
    action: "revoke",
    module: "products",
    resourceType: "ProductShare",
    resourceId: share._id,
    req,
  });
  return serializeShare(share);
}

async function listSuppliers(query = {}) {
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 50));
  const filter = notDeleted({ stage: "won", verificationStatus: "verified" });
  if (query.search) {
    filter.$or = [{ name: regex(query.search) }, { legalName: regex(query.search) }, { email: regex(query.search) }];
  }
  const items = await Lead.find(filter).select(SUPPLIER_SELECT).sort({ name: 1 }).limit(limit).lean();
  return { items: items.map(serializeSupplier) };
}

async function listCategories() {
  const values = await Product.distinct("category", notDeleted({ category: { $gt: "" } }));
  return { items: values.filter(Boolean).sort((a, b) => a.localeCompare(b)) };
}

async function listDistributors(query = {}) {
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 50));
  const filter = notDeleted();
  if (query.search) {
    filter.$or = [{ name: regex(query.search) }, { legalName: regex(query.search) }, { country: regex(query.search) }];
  }
  const items = await ExportBuyer.find(filter).select("name legalName country status").sort({ name: 1 }).limit(limit).lean();
  return {
    items: items.map((item) => ({
      id: String(item._id),
      name: item.name,
      legalName: item.legalName || "",
      country: item.country || "",
      status: item.status || "",
    })),
  };
}

async function markInVerification(productId) {
  const item = await Product.findOne(notDeleted({ _id: productId }));
  if (!item) return null;
  if (item.status === "archived") return item;
  if (item.status === "draft" || item.status === "rejected" || item.status === "verified") {
    if (item.listingStatus !== "listed") item.status = "in_verification";
    await item.save();
  }
  return item;
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  listToCatalog,
  unlistFromCatalog,
  archive,
  listShares,
  shareWithBuyer,
  revokeShare,
  listSuppliers,
  listDistributors,
  listCategories,
  revokeOpenShares,
  markInVerification,
  loadAssignableSupplier,
  canList,
  hideFinance,
};

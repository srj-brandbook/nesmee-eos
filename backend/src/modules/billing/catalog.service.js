const TaxRate = require("../../models/TaxRate");
const ServiceOffering = require("../../models/ServiceOffering");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializeTaxRate, serializeOffering } = require("../../utils/billingSerializer");
const auditService = require("../audit/audit.service");

function notDeleted(extra = {}) {
  return { deletedAt: null, ...extra };
}

async function listTaxRates(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = notDeleted();
  if (query.active === "true") filter.isActive = true;
  if (query.active === "false") filter.isActive = false;
  const [items, total] = await Promise.all([
    TaxRate.find(filter).sort({ isDefault: -1, rate: -1, name: 1 }).skip(skip).limit(limit).lean(),
    TaxRate.countDocuments(filter),
  ]);
  return { items: items.map(serializeTaxRate), pagination: paginationMeta({ page, limit, total }) };
}

async function createTaxRate(payload, actor, req) {
  const existing = await TaxRate.findOne(notDeleted({ code: String(payload.code || "").toUpperCase() }));
  if (existing) throw ApiError.conflict("A tax rate with this code already exists", { code: "Code already used" });
  if (payload.isDefault) await TaxRate.updateMany({ deletedAt: null }, { $set: { isDefault: false } });
  const rate = await TaxRate.create({
    name: payload.name,
    code: String(payload.code).toUpperCase(),
    rate: Number(payload.rate) || 0,
    isActive: payload.isActive !== false,
    isDefault: Boolean(payload.isDefault),
  });
  await auditService.log({ actor, action: "create", module: "billing", resourceType: "TaxRate", resourceId: rate._id, req });
  return serializeTaxRate(rate);
}

async function updateTaxRate(id, payload, actor, req) {
  const rate = await TaxRate.findOne(notDeleted({ _id: id }));
  if (!rate) throw ApiError.notFound("Tax rate not found");
  if (payload.code) {
    const code = String(payload.code).toUpperCase();
    const clash = await TaxRate.findOne(notDeleted({ code, _id: { $ne: id } }));
    if (clash) throw ApiError.conflict("A tax rate with this code already exists", { code: "Code already used" });
    rate.code = code;
  }
  if (payload.name !== undefined) rate.name = payload.name;
  if (payload.rate !== undefined) rate.rate = Number(payload.rate) || 0;
  if (payload.isActive !== undefined) rate.isActive = Boolean(payload.isActive);
  if (payload.isDefault) {
    await TaxRate.updateMany({ deletedAt: null, _id: { $ne: id } }, { $set: { isDefault: false } });
    rate.isDefault = true;
  } else if (payload.isDefault === false) {
    rate.isDefault = false;
  }
  await rate.save();
  await auditService.log({ actor, action: "update", module: "billing", resourceType: "TaxRate", resourceId: rate._id, req });
  return serializeTaxRate(rate);
}

async function removeTaxRate(id, actor, req) {
  const rate = await TaxRate.findOne(notDeleted({ _id: id }));
  if (!rate) throw ApiError.notFound("Tax rate not found");
  rate.deletedAt = new Date();
  rate.isDefault = false;
  rate.isActive = false;
  await rate.save();
  await auditService.log({ actor, action: "delete", module: "billing", resourceType: "TaxRate", resourceId: rate._id, req });
}

async function listOfferings(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "name", "code", "unitPrice", "category"]);
  const filter = notDeleted();
  if (query.category) filter.category = query.category;
  if (query.active === "true") filter.isActive = true;
  if (query.active === "false") filter.isActive = false;
  if (query.documentKey) filter.documentKey = query.documentKey;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { code: { $regex: query.search, $options: "i" } },
      { documentKey: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
    ];
  }
  const [items, total] = await Promise.all([
    ServiceOffering.find(filter)
      .populate("taxRateId")
      .populate("formDefinitionId", "name purpose")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    ServiceOffering.countDocuments(filter),
  ]);
  return { items: items.map(serializeOffering), pagination: paginationMeta({ page, limit, total }) };
}

async function getOffering(id) {
  const item = await ServiceOffering.findOne(notDeleted({ _id: id }))
    .populate("taxRateId")
    .populate("formDefinitionId", "name purpose")
    .lean();
  if (!item) throw ApiError.notFound("Service not found");
  return serializeOffering(item);
}

async function createOffering(payload, actor, req) {
  const code = String(payload.code).toUpperCase();
  const existing = await ServiceOffering.findOne(notDeleted({ code }));
  if (existing) throw ApiError.conflict("A service with this code already exists", { code: "Code already used" });
  const item = await ServiceOffering.create({
    ...payload,
    code,
    createdBy: actor?._id || null,
    updatedBy: actor?._id || null,
    taxRateId: payload.taxRateId || null,
    formDefinitionId: payload.formDefinitionId || null,
  });
  await auditService.log({ actor, action: "create", module: "billing", resourceType: "ServiceOffering", resourceId: item._id, req });
  return getOffering(item._id);
}

async function updateOffering(id, payload, actor, req) {
  const item = await ServiceOffering.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Service not found");
  if (payload.code) {
    const code = String(payload.code).toUpperCase();
    const clash = await ServiceOffering.findOne(notDeleted({ code, _id: { $ne: id } }));
    if (clash) throw ApiError.conflict("A service with this code already exists", { code: "Code already used" });
    payload.code = code;
  }
  if (payload.taxRateId === "") payload.taxRateId = null;
  if (payload.formDefinitionId === "") payload.formDefinitionId = null;
  Object.assign(item, payload, { updatedBy: actor?._id || null });
  await item.save();
  await auditService.log({ actor, action: "update", module: "billing", resourceType: "ServiceOffering", resourceId: item._id, req });
  return getOffering(item._id);
}

async function removeOffering(id, actor, req) {
  const item = await ServiceOffering.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Service not found");
  item.deletedAt = new Date();
  item.isActive = false;
  await item.save();
  await auditService.log({ actor, action: "delete", module: "billing", resourceType: "ServiceOffering", resourceId: item._id, req });
}

module.exports = {
  listTaxRates,
  createTaxRate,
  updateTaxRate,
  removeTaxRate,
  listOfferings,
  getOffering,
  createOffering,
  updateOffering,
  removeOffering,
};

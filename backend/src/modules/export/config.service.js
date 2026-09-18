const User = require("../../models/User");
const ExportLookup = require("../../models/ExportLookup");
const ExportIncoterm = require("../../models/ExportIncoterm");
const ExportScoreProfile = require("../../models/ExportScoreProfile");
const ExportFxRate = require("../../models/ExportFxRate");
const ExportSettings = require("../../models/ExportSettings");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const {
  serializeLookup,
  serializeIncoterm,
  serializeScoreProfile,
  serializeFxRate,
  serializeSettings,
} = require("../../utils/exportSerializer");
const auditService = require("../audit/audit.service");
const { validateProfile } = require("./engines/score.engine");
const { notDeleted, stamp } = require("./export.helpers");

const OWNER_SELECT = "name email avatarUrl";

async function assignees() {
  const users = await User.find(notDeleted({ status: "active" })).select("name email").sort({ name: 1 }).lean();
  return users.map((user) => ({ id: String(user._id), name: user.name, email: user.email }));
}

async function listLookups(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["sortOrder", "name", "code", "createdAt"]);
  const filter = notDeleted();
  if (query.type) filter.type = query.type;
  if (query.status) filter.status = query.status;
  if (query.countryCode) filter.countryCode = String(query.countryCode).toUpperCase();
  if (query.search) {
    filter.$or = [{ name: { $regex: query.search, $options: "i" } }, { code: { $regex: query.search, $options: "i" } }];
  }
  const [items, total] = await Promise.all([
    ExportLookup.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    ExportLookup.countDocuments(filter),
  ]);
  return { items: items.map(serializeLookup), pagination: paginationMeta({ page, limit, total }) };
}

async function createLookup(payload, actor, req) {
  const item = await ExportLookup.create({ ...payload, code: String(payload.code || "").trim(), ...stamp(actor, true) });
  await auditService.log({ actor, action: "create", module: "export-lookups", resourceType: "ExportLookup", resourceId: item._id, req });
  return serializeLookup(item);
}

async function updateLookup(id, payload, actor, req) {
  const item = await ExportLookup.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Lookup not found");
  Object.assign(item, payload, stamp(actor));
  if (payload.code) item.code = String(payload.code).trim();
  await item.save();
  await auditService.log({ actor, action: "update", module: "export-lookups", resourceType: "ExportLookup", resourceId: item._id, req });
  return serializeLookup(item);
}

async function removeLookup(id, actor, req) {
  const item = await ExportLookup.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Lookup not found");
  item.deletedAt = new Date();
  await item.save();
  await auditService.log({ actor, action: "delete", module: "export-lookups", resourceType: "ExportLookup", resourceId: item._id, req });
}

async function listIncoterms(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = notDeleted();
  if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([
    ExportIncoterm.find(filter).sort({ code: 1 }).skip(skip).limit(limit).lean(),
    ExportIncoterm.countDocuments(filter),
  ]);
  return { items: items.map(serializeIncoterm), pagination: paginationMeta({ page, limit, total }) };
}

async function createIncoterm(payload, actor, req) {
  const item = await ExportIncoterm.create({ ...payload, code: String(payload.code || "").toUpperCase(), ...stamp(actor, true) });
  await auditService.log({ actor, action: "create", module: "export-incoterms", resourceType: "ExportIncoterm", resourceId: item._id, req });
  return serializeIncoterm(item);
}

async function updateIncoterm(id, payload, actor, req) {
  const item = await ExportIncoterm.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Incoterm not found");
  Object.assign(item, payload, stamp(actor));
  if (payload.code) item.code = String(payload.code).toUpperCase();
  await item.save();
  await auditService.log({ actor, action: "update", module: "export-incoterms", resourceType: "ExportIncoterm", resourceId: item._id, req });
  return serializeIncoterm(item);
}

async function removeIncoterm(id, actor, req) {
  const item = await ExportIncoterm.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Incoterm not found");
  item.deletedAt = new Date();
  await item.save();
  await auditService.log({ actor, action: "delete", module: "export-incoterms", resourceType: "ExportIncoterm", resourceId: item._id, req });
}

async function listScoreProfiles(query = {}) {
  const filter = notDeleted();
  if (query.scope) filter.scope = query.scope;
  const items = await ExportScoreProfile.find(filter).sort({ scope: 1, name: 1 }).lean();
  return { items: items.map(serializeScoreProfile) };
}

async function createScoreProfile(payload, actor, req) {
  const check = validateProfile(payload);
  if (!check.ok) throw ApiError.validation({ factors: check.message }, check.message);
  const item = await ExportScoreProfile.create({ ...payload, ...stamp(actor, true) });
  await auditService.log({ actor, action: "create", module: "export-score-profiles", resourceType: "ExportScoreProfile", resourceId: item._id, req });
  return serializeScoreProfile(item);
}

async function updateScoreProfile(id, payload, actor, req) {
  const item = await ExportScoreProfile.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Score profile not found");
  const next = { ...item.toObject(), ...payload };
  const check = validateProfile(next);
  if (!check.ok) throw ApiError.validation({ factors: check.message }, check.message);
  Object.assign(item, payload, stamp(actor));
  await item.save();
  await auditService.log({ actor, action: "update", module: "export-score-profiles", resourceType: "ExportScoreProfile", resourceId: item._id, req });
  return serializeScoreProfile(item);
}

async function removeScoreProfile(id, actor, req) {
  const item = await ExportScoreProfile.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Score profile not found");
  item.deletedAt = new Date();
  await item.save();
  await auditService.log({ actor, action: "delete", module: "export-score-profiles", resourceType: "ExportScoreProfile", resourceId: item._id, req });
}

async function activeScoreProfile(scope) {
  const profile = await ExportScoreProfile.findOne(notDeleted({ scope, status: "active" })).sort({ updatedAt: -1 }).lean();
  if (!profile) throw ApiError.notFound(`No active ${scope} score profile`);
  return profile;
}

async function listFxRates(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = notDeleted();
  if (query.base) filter.base = String(query.base).toUpperCase();
  if (query.quote) filter.quote = String(query.quote).toUpperCase();
  const [items, total] = await Promise.all([
    ExportFxRate.find(filter).sort({ rateDate: -1 }).skip(skip).limit(limit).lean(),
    ExportFxRate.countDocuments(filter),
  ]);
  return { items: items.map(serializeFxRate), pagination: paginationMeta({ page, limit, total }) };
}

async function createFxRate(payload, actor, req) {
  const item = await ExportFxRate.create({
    ...payload,
    base: String(payload.base || "").toUpperCase(),
    quote: String(payload.quote || "").toUpperCase(),
    ...stamp(actor, true),
  });
  await auditService.log({ actor, action: "create", module: "export-fx", resourceType: "ExportFxRate", resourceId: item._id, req });
  return serializeFxRate(item);
}

async function updateFxRate(id, payload, actor, req) {
  const item = await ExportFxRate.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("FX rate not found");
  Object.assign(item, payload, stamp(actor));
  if (payload.base) item.base = String(payload.base).toUpperCase();
  if (payload.quote) item.quote = String(payload.quote).toUpperCase();
  await item.save();
  await auditService.log({ actor, action: "update", module: "export-fx", resourceType: "ExportFxRate", resourceId: item._id, req });
  return serializeFxRate(item);
}

async function removeFxRate(id, actor, req) {
  const item = await ExportFxRate.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("FX rate not found");
  item.deletedAt = new Date();
  await item.save();
  await auditService.log({ actor, action: "delete", module: "export-fx", resourceType: "ExportFxRate", resourceId: item._id, req });
}

async function loadFxRates() {
  return ExportFxRate.find(notDeleted()).sort({ rateDate: -1 }).lean();
}

async function getSettings() {
  let settings = await ExportSettings.findOne({ key: "export" });
  if (!settings) settings = await ExportSettings.create({ key: "export" });
  return serializeSettings(settings);
}

async function updateSettings(payload, actor, req) {
  const settings = await ExportSettings.findOneAndUpdate(
    { key: "export" },
    { $set: { ...payload, ...stamp(actor) } },
    { new: true, upsert: true }
  );
  await auditService.log({ actor, action: "update", module: "export-settings", resourceType: "ExportSettings", resourceId: settings._id, req });
  return serializeSettings(settings);
}

module.exports = {
  OWNER_SELECT,
  assignees,
  listLookups,
  createLookup,
  updateLookup,
  removeLookup,
  listIncoterms,
  createIncoterm,
  updateIncoterm,
  removeIncoterm,
  listScoreProfiles,
  createScoreProfile,
  updateScoreProfile,
  removeScoreProfile,
  activeScoreProfile,
  listFxRates,
  createFxRate,
  updateFxRate,
  removeFxRate,
  loadFxRates,
  getSettings,
  updateSettings,
};

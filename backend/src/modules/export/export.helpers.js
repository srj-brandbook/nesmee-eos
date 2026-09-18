const crypto = require("crypto");

function notDeleted(extra = {}) {
  return { deletedAt: null, ...extra };
}

function cleanOwner(value) {
  if (value === undefined) return undefined;
  if (value === "" || value === null) return null;
  return value;
}

function stamp(actor, isCreate = false) {
  const next = { updatedBy: actor?._id || null };
  if (isCreate) next.createdBy = actor?._id || null;
  return next;
}

function makeKey() {
  return crypto.randomBytes(8).toString("hex");
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

async function audit(auditService, { actor, action, module, resourceType, resourceId, req, metadata }) {
  await auditService.log({ actor, action, module, resourceType, resourceId, req, metadata });
}

module.exports = { notDeleted, cleanOwner, stamp, makeKey, hasPermission, hideFinance, regex, audit };

const BillingSettings = require("../../models/BillingSettings");
const TaxRate = require("../../models/TaxRate");
const auditService = require("../audit/audit.service");
const { serializeSettings } = require("../../utils/billingSerializer");
const { ensureSettings } = require("./numbering");

const SETTINGS_FIELDS = [
  "legalName",
  "address",
  "city",
  "state",
  "pincode",
  "gstin",
  "pan",
  "email",
  "phone",
  "logoUrl",
  "currency",
  "invoicePrefix",
  "creditNotePrefix",
  "jobPrefix",
  "paymentPrefix",
  "defaultDueDays",
  "defaultTaxRateId",
  "paymentTerms",
  "bankName",
  "bankAccount",
  "bankIfsc",
  "upiId",
  "paymentFooter",
  "reminderDays",
];

async function hydrateSettings(doc) {
  const settings = await BillingSettings.findById(doc._id).populate("defaultTaxRateId").lean();
  return serializeSettings(settings);
}

async function getSettings() {
  const settings = await ensureSettings();
  return hydrateSettings(settings);
}

async function updateSettings(payload, actor, req) {
  const patch = {};
  SETTINGS_FIELDS.forEach((field) => {
    if (payload[field] !== undefined) patch[field] = payload[field];
  });
  if (payload.defaultTaxRateId === "") patch.defaultTaxRateId = null;
  if (payload.gstin) patch.gstin = String(payload.gstin).toUpperCase();
  if (payload.pan) patch.pan = String(payload.pan).toUpperCase();
  if (payload.bankIfsc) patch.bankIfsc = String(payload.bankIfsc).toUpperCase();
  if (payload.invoicePrefix) patch.invoicePrefix = String(payload.invoicePrefix).toUpperCase();
  if (payload.creditNotePrefix) patch.creditNotePrefix = String(payload.creditNotePrefix).toUpperCase();
  if (payload.jobPrefix) patch.jobPrefix = String(payload.jobPrefix).toUpperCase();
  if (payload.paymentPrefix) patch.paymentPrefix = String(payload.paymentPrefix).toUpperCase();
  if (payload.currency) patch.currency = String(payload.currency).toUpperCase();
  patch.updatedBy = actor?._id || null;

  const settings = await BillingSettings.findOneAndUpdate(
    { key: "billing" },
    { $set: patch, $setOnInsert: { key: "billing", createdBy: actor?._id || null } },
    { upsert: true, new: true }
  );

  if (patch.defaultTaxRateId) {
    const rate = await TaxRate.findOne({ _id: patch.defaultTaxRateId, deletedAt: null });
    if (rate) {
      await TaxRate.updateMany({ deletedAt: null }, { $set: { isDefault: false } });
      rate.isDefault = true;
      await rate.save();
    }
  }

  await auditService.log({
    actor,
    action: "update",
    module: "billing",
    resourceType: "BillingSettings",
    resourceId: settings._id,
    req,
    metadata: patch,
  });
  return hydrateSettings(settings);
}

module.exports = { getSettings, updateSettings, ensureSettings };

const BillingSettings = require("../../models/BillingSettings");

async function ensureSettings() {
  return BillingSettings.findOneAndUpdate(
    { key: "billing" },
    { $setOnInsert: { key: "billing" } },
    { upsert: true, new: true }
  );
}

async function nextNumber(counterField, prefixField, fallbackPrefix) {
  await ensureSettings();
  const settings = await BillingSettings.findOneAndUpdate({ key: "billing" }, { $inc: { [counterField]: 1 } }, { new: true });
  const seq = Number(settings[counterField]) || 1;
  const prefix = String(settings[prefixField] || fallbackPrefix).toUpperCase();
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

function nextJobNumber() {
  return nextNumber("jobNextNumber", "jobPrefix", "JOB");
}

function nextInvoiceNumber() {
  return nextNumber("invoiceNextNumber", "invoicePrefix", "INV");
}

function nextCreditNoteNumber() {
  return nextNumber("creditNoteNextNumber", "creditNotePrefix", "CN");
}

function nextPaymentNumber() {
  return nextNumber("paymentNextNumber", "paymentPrefix", "PAY");
}

module.exports = {
  ensureSettings,
  nextJobNumber,
  nextInvoiceNumber,
  nextCreditNoteNumber,
  nextPaymentNumber,
};

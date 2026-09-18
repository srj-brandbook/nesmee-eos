const TaxRate = require("../models/TaxRate");
const ServiceOffering = require("../models/ServiceOffering");
const BillingSettings = require("../models/BillingSettings");
const FormDefinition = require("../models/FormDefinition");
const { ensureSettings } = require("../modules/billing/numbering");

const TAX_RATES = [
  { name: "GST 18%", code: "GST18", rate: 18, isDefault: true, isActive: true },
  { name: "GST 5%", code: "GST5", rate: 5, isDefault: false, isActive: true },
  { name: "Exempt", code: "EXEMPT", rate: 0, isDefault: false, isActive: true },
];

const OFFERINGS = [
  {
    code: "FSSAI",
    name: "FSSAI license procurement",
    category: "certificate",
    description: "Obtain or renew an FSSAI license for the supplier’s processing unit.",
    unitPrice: 25000,
    costPrice: 8000,
    slaDays: 21,
    documentKey: "fssai_license",
    hsnSac: "9983",
  },
  {
    code: "HACCP",
    name: "HACCP certificate facilitation",
    category: "certificate",
    description: "Facilitate HACCP certification for the supplier’s food safety system.",
    unitPrice: 45000,
    costPrice: 18000,
    slaDays: 30,
    documentKey: "haccp_certificate",
    hsnSac: "9983",
  },
  {
    code: "GSTCERT",
    name: "GST registration / certificate",
    category: "certificate",
    description: "Obtain GST registration and certificate for the supplier’s business.",
    unitPrice: 8000,
    costPrice: 1500,
    slaDays: 10,
    documentKey: "gst_certificate",
    hsnSac: "9983",
  },
  {
    code: "MFG-LIC",
    name: "Manufacturing license",
    category: "certificate",
    description: "Obtain a manufacturing license required for the supplier’s product line.",
    unitPrice: 18000,
    costPrice: 5000,
    slaDays: 21,
    documentKey: "manufacturing_license",
    hsnSac: "9983",
  },
  {
    code: "COLD-STOR",
    name: "Cold storage license",
    category: "certificate",
    description: "Obtain a cold storage license when frozen processing is in scope.",
    unitPrice: 22000,
    costPrice: 7000,
    slaDays: 21,
    documentKey: "cold_storage_license",
    hsnSac: "9983",
  },
  {
    code: "FF-PERMIT",
    name: "Frozen food processing permit",
    category: "certificate",
    description: "Obtain the frozen food processing permit used in supplier verification.",
    unitPrice: 28000,
    costPrice: 9000,
    slaDays: 21,
    documentKey: "frozen_food_processing_permit",
    hsnSac: "9983",
  },
];

async function seedBilling() {
  await ensureSettings();
  const rates = [];
  for (const item of TAX_RATES) {
    const rate = await TaxRate.findOneAndUpdate(
      { code: item.code, deletedAt: null },
      { $set: { ...item, deletedAt: null } },
      { upsert: true, new: true }
    );
    rates.push(rate);
  }
  const gst18 = rates.find((item) => item.code === "GST18");
  await BillingSettings.findOneAndUpdate(
    { key: "billing" },
    {
      $set: {
        defaultTaxRateId: gst18?._id || null,
        legalName: "Nesmee EOS",
        state: "Maharashtra",
        city: "Mumbai",
        currency: "INR",
        paymentTerms: "Payment due within 15 days of invoice date.",
        paymentFooter: "Please quote the invoice number in the bank transfer reference.",
      },
    },
    { upsert: true }
  );

  const verificationForm = await FormDefinition.findOne({
    purpose: "supplier_verification",
    deletedAt: null,
    status: "published",
  }).lean();

  for (const item of OFFERINGS) {
    await ServiceOffering.findOneAndUpdate(
      { code: item.code, deletedAt: null },
      {
        $set: {
          ...item,
          currency: "INR",
          isActive: true,
          taxRateId: gst18?._id || null,
          formDefinitionId: verificationForm?._id || null,
          deletedAt: null,
        },
      },
      { upsert: true, new: true }
    );
  }
}

module.exports = { seedBilling };

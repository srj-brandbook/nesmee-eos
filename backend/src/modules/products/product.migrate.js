const ExportProduct = require("../../models/ExportProduct");
const Product = require("../../models/Product");
const logger = require("../../config/logger");

function unitFrom(source) {
  return source.unit && source.unit !== "unit" ? source.unit : "unit";
}

async function migrateExportProducts() {
  const existing = await ExportProduct.find({}).lean();
  if (!existing.length) return { copied: 0, skipped: 0 };
  let copied = 0;
  let skipped = 0;
  for (const source of existing) {
    const already = await Product.findById(source._id).lean();
    if (already) {
      skipped += 1;
      continue;
    }
    await Product.collection.insertOne({
      _id: source._id,
      supplierId: null,
      name: source.name,
      brand: "",
      originCountry: "",
      category: source.category || "",
      tags: [],
      sku: source.sku || "",
      hsCode: source.hsCode || "",
      unit: unitFrom(source),
      identifiers: { gtin: "", barcode: "", other: [] },
      measurements: source.unit
        ? [{ name: "Unit", dimension: "count", value: null, maxValue: null, unit: source.unit, notes: "" }]
        : [],
      attributes: [],
      description: source.notes || "",
      highlights: [],
      packagingNotes: "",
      moq: { value: 0, unit: "" },
      leadTimeDays: 0,
      incotermCode: "",
      indicativePrice: source.baseCost || 0,
      currency: source.baseCurrency || "INR",
      baseCost: source.baseCost || 0,
      baseCurrency: source.baseCurrency || "INR",
      media: [],
      status: source.status === "inactive" ? "archived" : "verified",
      listingStatus: source.status === "inactive" ? "unlisted" : "listed",
      verificationStatus: "none",
      verificationSummary: { required: 0, verified: 0, pending: 0, expired: 0, expiringSoon: 0 },
      listedAt: source.status === "inactive" ? null : source.createdAt || new Date(),
      listedBy: source.updatedBy || source.createdBy || null,
      origin: "migrated",
      notes: source.notes || "",
      customFields: source.customFields || {},
      ownerId: source.ownerId || null,
      createdBy: source.createdBy || null,
      updatedBy: source.updatedBy || null,
      deletedAt: source.deletedAt || null,
      createdAt: source.createdAt || new Date(),
      updatedAt: source.updatedAt || new Date(),
    });
    copied += 1;
  }
  if (copied) logger.info({ copied, skipped }, "Migrated export products into catalog");
  return { copied, skipped };
}

module.exports = { migrateExportProducts };

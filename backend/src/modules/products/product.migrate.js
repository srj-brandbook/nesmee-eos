const mongoose = require("mongoose");
const Product = require("../../models/Product");
const logger = require("../../config/logger");

const SOURCE_COLLECTION = "exportproducts";

function unitFrom(source) {
  return source.unit && source.unit !== "unit" ? source.unit : "unit";
}

function sourceCollection() {
  return mongoose.connection.db?.collection(SOURCE_COLLECTION) || null;
}

function catalogDoc(source) {
  return {
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
  };
}

async function migrateExportProducts() {
  const source = sourceCollection();
  if (!source) return { copied: 0, skipped: 0, removed: 0 };
  const existing = await source.find({}).toArray();
  if (!existing.length) return { copied: 0, skipped: 0, removed: 0 };

  let copied = 0;
  let skipped = 0;
  const removable = [];

  for (const item of existing) {
    const already = await Product.findById(item._id).lean();
    if (already) {
      skipped += 1;
      removable.push(item._id);
      continue;
    }
    try {
      await Product.collection.insertOne(catalogDoc(item));
      copied += 1;
      removable.push(item._id);
    } catch (error) {
      logger.error({ err: error, id: String(item._id) }, "Failed to migrate export product");
    }
  }

  if (removable.length) {
    await source.deleteMany({ _id: { $in: removable } });
  }

  if (!(await source.countDocuments())) {
    try {
      await source.drop();
    } catch {
      // collection may already be gone
    }
  }

  if (copied || skipped) {
    logger.info({ copied, skipped, removed: removable.length }, "Migrated export products into catalog");
  }
  return { copied, skipped, removed: removable.length };
}

module.exports = { migrateExportProducts };

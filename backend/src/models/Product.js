const mongoose = require("mongoose");
const {
  PRODUCT_STATUSES,
  PRODUCT_LISTING_STATUSES,
  PRODUCT_ORIGINS,
  PRODUCT_MEDIA_KINDS,
  PRODUCT_MEDIA_ROLES,
  PRODUCT_MEASUREMENT_DIMENSIONS,
  PRODUCT_VERIFICATION_STATUSES,
} = require("../constants/products");

const fileSchema = new mongoose.Schema(
  {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
    name: { type: String, default: "" },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: "" },
    type: { type: String, default: "" },
    resourceType: { type: String, default: "" },
    format: { type: String, default: "" },
    pages: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false }
);

const identifierOtherSchema = new mongoose.Schema(
  {
    key: { type: String, default: "", trim: true },
    value: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const measurementSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true },
    dimension: { type: String, enum: PRODUCT_MEASUREMENT_DIMENSIONS, default: "custom" },
    value: { type: Number, default: null },
    maxValue: { type: Number, default: null },
    unit: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const attributeSchema = new mongoose.Schema(
  {
    group: { type: String, default: "", trim: true },
    name: { type: String, default: "", trim: true },
    value: { type: String, default: "", trim: true },
    unit: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const mediaSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: PRODUCT_MEDIA_KINDS, default: "photo" },
    role: { type: String, enum: PRODUCT_MEDIA_ROLES, default: "gallery" },
    caption: { type: String, default: "", trim: true },
    sortOrder: { type: Number, default: 0 },
    file: { type: fileSchema, default: () => ({}) },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null, index: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, default: "", trim: true },
    originCountry: { type: String, default: "", trim: true },
    category: { type: String, default: "", trim: true },
    tags: { type: [String], default: [] },
    sku: { type: String, default: "", trim: true, uppercase: true },
    hsCode: { type: String, default: "", trim: true },
    unit: { type: String, default: "unit", trim: true },
    identifiers: {
      gtin: { type: String, default: "", trim: true },
      barcode: { type: String, default: "", trim: true },
      other: { type: [identifierOtherSchema], default: [] },
    },
    measurements: { type: [measurementSchema], default: [] },
    attributes: { type: [attributeSchema], default: [] },
    description: { type: String, default: "", trim: true },
    highlights: { type: [String], default: [] },
    packagingNotes: { type: String, default: "", trim: true },
    moq: {
      value: { type: Number, default: 0 },
      unit: { type: String, default: "", trim: true },
    },
    leadTimeDays: { type: Number, default: 0 },
    incotermCode: { type: String, default: "", trim: true, uppercase: true },
    indicativePrice: { type: Number, default: 0 },
    currency: { type: String, default: "INR", trim: true, uppercase: true },
    baseCost: { type: Number, default: 0 },
    baseCurrency: { type: String, default: "INR", trim: true, uppercase: true },
    media: { type: [mediaSchema], default: [] },
    status: { type: String, enum: PRODUCT_STATUSES, default: "draft", index: true },
    listingStatus: { type: String, enum: PRODUCT_LISTING_STATUSES, default: "unlisted", index: true },
    verificationStatus: { type: String, enum: PRODUCT_VERIFICATION_STATUSES, default: "none", index: true },
    verificationSummary: {
      required: { type: Number, default: 0 },
      verified: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      expired: { type: Number, default: 0 },
      expiringSoon: { type: Number, default: 0 },
    },
    listedAt: { type: Date, default: null },
    listedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    origin: { type: String, enum: PRODUCT_ORIGINS, default: "catalog" },
    notes: { type: String, default: "", trim: true },
    customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

productSchema.index({ name: 1, deletedAt: 1 });
productSchema.index(
  { sku: 1, deletedAt: 1 },
  { unique: true, partialFilterExpression: { sku: { $gt: "" }, deletedAt: null } }
);
productSchema.index({ supplierId: 1, listingStatus: 1, status: 1 });
productSchema.index({ listingStatus: 1, createdAt: -1 });
productSchema.index({ category: 1, deletedAt: 1 });
productSchema.index({ hsCode: 1 });

module.exports = mongoose.model("Product", productSchema);

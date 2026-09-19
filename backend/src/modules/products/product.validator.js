const Joi = require("joi");
const {
  PRODUCT_STATUSES,
  PRODUCT_LISTING_STATUSES,
  PRODUCT_MEDIA_KINDS,
  PRODUCT_MEDIA_ROLES,
  PRODUCT_MEASUREMENT_DIMENSIONS,
  PRODUCT_VERIFICATION_STATUSES,
} = require("../../constants/products");

const objectId = Joi.string().hex().length(24);

const fileSchema = Joi.object({
  url: Joi.string().allow(""),
  publicId: Joi.string().allow(""),
  name: Joi.string().allow(""),
  size: Joi.number(),
  mimeType: Joi.string().allow(""),
  type: Joi.string().allow(""),
  resourceType: Joi.string().allow(""),
  format: Joi.string().allow(""),
  pages: Joi.number(),
  duration: Joi.number(),
  uploadedAt: Joi.date().allow(null),
  uploadedBy: objectId.allow(null, ""),
}).unknown(true);

const measurementSchema = Joi.object({
  name: Joi.string().trim().allow(""),
  dimension: Joi.string().valid(...PRODUCT_MEASUREMENT_DIMENSIONS),
  value: Joi.number().allow(null),
  maxValue: Joi.number().allow(null),
  unit: Joi.string().trim().allow(""),
  notes: Joi.string().trim().allow(""),
});

const attributeSchema = Joi.object({
  group: Joi.string().trim().allow(""),
  name: Joi.string().trim().allow(""),
  value: Joi.string().trim().allow(""),
  unit: Joi.string().trim().allow(""),
});

const mediaSchema = Joi.object({
  id: objectId,
  _id: objectId,
  kind: Joi.string().valid(...PRODUCT_MEDIA_KINDS),
  role: Joi.string().valid(...PRODUCT_MEDIA_ROLES),
  caption: Joi.string().trim().allow(""),
  sortOrder: Joi.number(),
  file: fileSchema,
});

const productBody = {
  supplierId: objectId.allow(null, ""),
  name: Joi.string().trim().min(2).max(200),
  brand: Joi.string().trim().allow(""),
  originCountry: Joi.string().trim().allow(""),
  category: Joi.string().trim().allow(""),
  tags: Joi.array().items(Joi.string().trim().allow("")),
  sku: Joi.string().trim().allow(""),
  hsCode: Joi.string().trim().allow(""),
  unit: Joi.string().trim().allow(""),
  identifiers: Joi.object({
    gtin: Joi.string().trim().allow(""),
    barcode: Joi.string().trim().allow(""),
    other: Joi.array().items(Joi.object({ key: Joi.string().trim().allow(""), value: Joi.string().trim().allow("") })),
  }),
  measurements: Joi.array().items(measurementSchema),
  attributes: Joi.array().items(attributeSchema),
  description: Joi.string().trim().allow(""),
  highlights: Joi.array().items(Joi.string().trim().allow("")),
  packagingNotes: Joi.string().trim().allow(""),
  moq: Joi.object({
    value: Joi.number().min(0).allow(null),
    unit: Joi.string().trim().allow(""),
  }),
  leadTimeDays: Joi.number().min(0),
  incotermCode: Joi.string().trim().allow(""),
  indicativePrice: Joi.number().min(0),
  currency: Joi.string().trim().allow(""),
  media: Joi.array().items(mediaSchema),
  notes: Joi.string().trim().allow(""),
  ownerId: objectId.allow(null, ""),
  customFields: Joi.object().unknown(true),
};

const listSchema = Joi.object({
  query: Joi.object({
    search: Joi.string().allow(""),
    supplierId: objectId,
    status: Joi.string().valid(...PRODUCT_STATUSES),
    listingStatus: Joi.string().valid(...PRODUCT_LISTING_STATUSES),
    verificationStatus: Joi.string().valid(...PRODUCT_VERIFICATION_STATUSES),
    category: Joi.string().allow(""),
    origin: Joi.string(),
    sort: Joi.string(),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }),
});

const createSchema = Joi.object({
  body: Joi.object({
    ...productBody,
    name: productBody.name.required(),
    supplierId: objectId.required(),
  }).required(),
});

const updateSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object(productBody).required(),
});

const idParamSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
});

const shareCreateSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    buyerId: objectId.required(),
    note: Joi.string().trim().allow("").max(2000),
  }).required(),
});

const shareRevokeSchema = Joi.object({
  params: Joi.object({ id: objectId.required(), shareId: objectId.required() }).required(),
});

const sharesQuerySchema = Joi.object({
  query: Joi.object({
    buyerId: objectId,
    productId: objectId,
    status: Joi.string().valid("shared", "revoked"),
    sort: Joi.string(),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }),
});

const suppliersQuerySchema = Joi.object({
  query: Joi.object({
    search: Joi.string().allow(""),
    limit: Joi.number().integer().min(1).max(100),
  }),
});

module.exports = {
  listSchema,
  createSchema,
  updateSchema,
  idParamSchema,
  shareCreateSchema,
  shareRevokeSchema,
  sharesQuerySchema,
  suppliersQuerySchema,
};

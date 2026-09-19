const Joi = require("joi");
const { VERIFICATION_CASE_STATUSES, DOCUMENT_REVIEW_ACTIONS, CASE_REVIEW_ACTIONS } = require("../../constants/verification");

const objectId = Joi.string().hex().length(24);

const fileSchema = Joi.object({
  url: Joi.string().allow(""),
  publicId: Joi.string().allow(""),
  name: Joi.string().allow(""),
  size: Joi.number(),
  mimeType: Joi.string().allow(""),
  type: Joi.string().allow(""),
  resourceType: Joi.string().allow(""),
  uploadedAt: Joi.date().allow(null),
  uploadedBy: objectId.allow(null),
}).unknown(true);

const listSchema = Joi.object({
  query: Joi.object({
    search: Joi.string().allow(""),
    status: Joi.string().valid(...VERIFICATION_CASE_STATUSES),
    leadId: objectId,
    productId: objectId,
    subjectType: Joi.string().valid("lead", "product"),
    formId: objectId,
    assignedTo: Joi.alternatives().try(Joi.string().valid("me", "all"), objectId),
    expiring: Joi.string().valid("true", "false"),
    sort: Joi.string(),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }),
});

const idParamSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
});

const leadParamSchema = Joi.object({
  params: Joi.object({ leadId: objectId.required() }).required(),
});

const productParamSchema = Joi.object({
  params: Joi.object({ productId: objectId.required() }).required(),
});

const documentParamSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
});

const createSchema = Joi.object({
  body: Joi.object({
    leadId: objectId,
    productId: objectId,
    formId: objectId.required(),
    assignedToId: objectId.allow("", null),
    dueAt: Joi.date().allow(null, ""),
    note: Joi.string().allow("").max(2000),
    title: Joi.string().trim().max(160),
    description: Joi.string().allow("").max(2000),
  })
    .or("leadId", "productId")
    .required(),
});

const saveSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    values: Joi.object().unknown(true).default({}),
  }).required(),
});

const assignSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    assignedToId: objectId.required(),
    dueAt: Joi.date().allow(null, ""),
    note: Joi.string().allow("").max(2000),
  }).required(),
});

const cancelSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    note: Joi.string().allow("").max(2000),
  }).default({}),
});

const updateDocumentSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    title: Joi.string().allow("").max(200),
    description: Joi.string().allow("").max(4000),
    issuer: Joi.string().allow("").max(200),
    documentNumber: Joi.string().allow("").max(120),
    issuedAt: Joi.date().allow(null, ""),
    expiresAt: Joi.date().allow(null, ""),
    files: Joi.array().items(fileSchema),
  }).required(),
});

const reviewDocumentSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    decision: Joi.string().valid(...DOCUMENT_REVIEW_ACTIONS).required(),
    note: Joi.string().allow("").max(2000),
  }).required(),
});

const reviewCaseSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    decision: Joi.string().valid(...CASE_REVIEW_ACTIONS).required(),
    note: Joi.string().allow("").max(2000),
  }).required(),
});

module.exports = {
  listSchema,
  idParamSchema,
  leadParamSchema,
  productParamSchema,
  documentParamSchema,
  createSchema,
  saveSchema,
  assignSchema,
  cancelSchema,
  updateDocumentSchema,
  reviewDocumentSchema,
  reviewCaseSchema,
};

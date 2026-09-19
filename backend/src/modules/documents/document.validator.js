const Joi = require("joi");
const { DOCUMENT_TYPES, DOCUMENT_STATUSES, TEMPLATE_STATUSES, SUBJECT_TYPES } = require("../../constants/documents");

const objectId = Joi.string().hex().length(24);
const mixedArray = Joi.array().items(Joi.any());
const letterhead = Joi.object({
  legalName: Joi.string().trim().allow("").max(160),
  address: Joi.string().trim().allow("").max(500),
  footer: Joi.string().trim().allow("").max(500),
  showLogo: Joi.boolean(),
}).unknown(true);

const fileSchema = Joi.object({
  id: objectId,
  url: Joi.string().allow(""),
  publicId: Joi.string().allow(""),
  name: Joi.string().allow(""),
  size: Joi.number(),
  mimeType: Joi.string().allow(""),
  type: Joi.string().allow(""),
  resourceType: Joi.string().allow(""),
  format: Joi.string().allow(""),
  pages: Joi.number(),
  kind: Joi.string().allow(""),
  uploadedAt: Joi.date().allow(null),
  uploadedBy: objectId.allow(null),
}).unknown(true);

const templateListSchema = Joi.object({
  query: Joi.object({
    search: Joi.string().allow(""),
    status: Joi.string().valid(...TEMPLATE_STATUSES),
    type: Joi.string().valid(...DOCUMENT_TYPES),
    subjectType: Joi.string().valid(...SUBJECT_TYPES),
    sort: Joi.string(),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }),
});

const documentListSchema = Joi.object({
  query: Joi.object({
    search: Joi.string().allow(""),
    status: Joi.string().valid(...DOCUMENT_STATUSES),
    type: Joi.string().valid(...DOCUMENT_TYPES),
    subjectType: Joi.string().valid(...SUBJECT_TYPES),
    subjectId: objectId,
    templateId: objectId,
    sort: Joi.string(),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }),
});

const idParamSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
});

const variablesSchema = Joi.object({
  query: Joi.object({
    subjectType: Joi.string().valid(...SUBJECT_TYPES),
  }),
});

const createTemplateSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().min(2).max(160).required(),
    description: Joi.string().trim().allow("").max(4000),
    type: Joi.string().valid(...DOCUMENT_TYPES),
    subjectTypes: Joi.array().items(Joi.string().valid(...SUBJECT_TYPES)).min(1),
    coverUrl: Joi.string().allow(""),
    icon: Joi.string().allow(""),
    letterhead,
    content: mixedArray,
  }).required(),
});

const updateTemplateSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    name: Joi.string().trim().min(2).max(160),
    description: Joi.string().trim().allow("").max(4000),
    type: Joi.string().valid(...DOCUMENT_TYPES),
    subjectTypes: Joi.array().items(Joi.string().valid(...SUBJECT_TYPES)).min(1),
    coverUrl: Joi.string().allow(""),
    icon: Joi.string().allow(""),
    letterhead,
  }).required(),
});

const draftSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    name: Joi.string().trim().min(2).max(160),
    description: Joi.string().trim().allow("").max(4000),
    content: mixedArray,
  }).required(),
});

const previewSchema = Joi.object({
  body: Joi.object({
    templateId: objectId,
    subjectType: Joi.string().valid(...SUBJECT_TYPES),
    subjectId: objectId,
    title: Joi.string().trim().allow("").max(200),
    type: Joi.string().valid(...DOCUMENT_TYPES),
    docNumber: Joi.string().allow(""),
  }).required(),
});

const generateSchema = Joi.object({
  body: Joi.object({
    templateId: objectId.required(),
    subjectType: Joi.string().valid(...SUBJECT_TYPES),
    subjectId: objectId,
    title: Joi.string().trim().allow("").max(200),
  }).required(),
});

const updateDocumentSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    title: Joi.string().trim().min(2).max(200),
    coverUrl: Joi.string().allow(""),
    icon: Joi.string().allow(""),
    status: Joi.string().valid("draft", "in_review"),
    content: mixedArray,
  }).required(),
});

const voidSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    reason: Joi.string().allow("").max(2000),
  }).default({}),
});

const attachmentsSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    attachments: Joi.array().items(fileSchema),
    attachmentOrder: Joi.array().items(Joi.string()),
  }).required(),
});

const fileKindSchema = Joi.object({
  params: Joi.object({
    id: objectId.required(),
    kind: Joi.string().valid("pdf", "packet").required(),
  }).required(),
});

module.exports = {
  templateListSchema,
  documentListSchema,
  idParamSchema,
  variablesSchema,
  createTemplateSchema,
  updateTemplateSchema,
  draftSchema,
  previewSchema,
  generateSchema,
  updateDocumentSchema,
  voidSchema,
  attachmentsSchema,
  fileKindSchema,
};

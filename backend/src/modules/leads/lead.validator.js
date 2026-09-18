const Joi = require("joi");
const { LEAD_STAGES, LEAD_SOURCES } = require("../../constants/crm");

const objectId = Joi.string().hex().length(24);

const listSchema = Joi.object({
  query: Joi.object({
    search: Joi.string().allow(""),
    stage: Joi.string().valid(...LEAD_STAGES),
    source: Joi.string().valid(...LEAD_SOURCES),
    country: Joi.string().allow(""),
    ownerId: objectId,
    sort: Joi.string(),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }),
});

const leadBody = {
  name: Joi.string().trim().min(2).max(160),
  legalName: Joi.string().trim().allow(""),
  email: Joi.string().trim().email().allow(""),
  phone: Joi.string().trim().allow(""),
  website: Joi.string().trim().allow(""),
  country: Joi.string().trim().allow(""),
  city: Joi.string().trim().allow(""),
  products: Joi.string().trim().allow(""),
  certifications: Joi.string().trim().allow(""),
  moq: Joi.string().trim().allow(""),
  exportMarkets: Joi.string().trim().allow(""),
  source: Joi.string().valid(...LEAD_SOURCES),
  stage: Joi.string().valid(...LEAD_STAGES),
  score: Joi.number().min(0).max(100),
  ownerId: objectId.allow(null, ""),
  gstin: Joi.string().trim().allow(""),
  billingState: Joi.string().trim().allow(""),
  billingAddress: Joi.string().trim().allow(""),
  pincode: Joi.string().trim().allow(""),
  notes: Joi.string().trim().allow(""),
  lostReason: Joi.string().trim().allow(""),
  disqualifiedReason: Joi.string().trim().allow(""),
  statusNote: Joi.string().trim().allow(""),
};

const createSchema = Joi.object({
  body: Joi.object({
    ...leadBody,
    name: leadBody.name.required(),
    primaryContact: Joi.object({
      name: Joi.string().trim().min(2).max(120).required(),
      role: Joi.string().trim().allow(""),
      email: Joi.string().trim().email().allow(""),
      phone: Joi.string().trim().allow(""),
    }),
  }).required(),
});

const updateSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object(leadBody).required(),
});

const convertSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    stage: Joi.string().valid("converted", "won").default("converted"),
    statusNote: Joi.string().trim().allow(""),
  }),
});

const contactBody = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  role: Joi.string().trim().allow(""),
  email: Joi.string().trim().email().allow(""),
  phone: Joi.string().trim().allow(""),
  isPrimary: Joi.boolean(),
  notes: Joi.string().trim().allow(""),
});

const createContactSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: contactBody.required(),
});

const updateContactSchema = Joi.object({
  params: Joi.object({ id: objectId.required(), contactId: objectId.required() }).required(),
  body: Joi.object({
    name: Joi.string().trim().min(2).max(120),
    role: Joi.string().trim().allow(""),
    email: Joi.string().trim().email().allow(""),
    phone: Joi.string().trim().allow(""),
    isPrimary: Joi.boolean(),
    notes: Joi.string().trim().allow(""),
  }).required(),
});

const contactParamSchema = Joi.object({
  params: Joi.object({ id: objectId.required(), contactId: objectId.required() }).required(),
});

const idParamSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
});

module.exports = {
  listSchema,
  createSchema,
  updateSchema,
  convertSchema,
  createContactSchema,
  updateContactSchema,
  contactParamSchema,
  idParamSchema,
};

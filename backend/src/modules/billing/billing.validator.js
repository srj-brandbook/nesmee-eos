const Joi = require("joi");
const {
  SERVICE_CATEGORIES,
  JOB_STATUSES,
  JOB_SOURCES,
  INVOICE_TYPES,
  INVOICE_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} = require("../../constants/billing");

const objectId = Joi.string().hex().length(24);
const date = Joi.date().iso();

const paging = {
  search: Joi.string().allow(""),
  sort: Joi.string(),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
};

const idParam = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
});

const fileSchema = Joi.object({
  url: Joi.string().allow(""),
  publicId: Joi.string().allow(""),
  name: Joi.string().allow(""),
  size: Joi.number(),
  mimeType: Joi.string().allow(""),
  type: Joi.string().allow(""),
  resourceType: Joi.string().allow(""),
  format: Joi.string().allow(""),
});

const lineSchema = Joi.object({
  offeringId: objectId.allow(null, ""),
  documentKey: Joi.string().trim().allow(""),
  formDefinitionId: objectId.allow(null, ""),
  description: Joi.string().trim().allow(""),
  hsnSac: Joi.string().trim().allow(""),
  quantity: Joi.number().min(0),
  unitPrice: Joi.number().min(0),
  discount: Joi.number().min(0),
  taxRateId: objectId.allow(null, ""),
  slaDays: Joi.number().min(0),
});

const billToSchema = Joi.object({
  name: Joi.string().trim().allow(""),
  legalName: Joi.string().trim().allow(""),
  email: Joi.string().trim().email().allow(""),
  phone: Joi.string().trim().allow(""),
  address: Joi.string().trim().allow(""),
  city: Joi.string().trim().allow(""),
  state: Joi.string().trim().allow(""),
  pincode: Joi.string().trim().allow(""),
  gstin: Joi.string().trim().allow(""),
  country: Joi.string().trim().allow(""),
});

const updateSettings = Joi.object({
  body: Joi.object({
    legalName: Joi.string().trim().allow(""),
    address: Joi.string().trim().allow(""),
    city: Joi.string().trim().allow(""),
    state: Joi.string().trim().allow(""),
    pincode: Joi.string().trim().allow(""),
    gstin: Joi.string().trim().allow(""),
    pan: Joi.string().trim().allow(""),
    email: Joi.string().trim().email().allow(""),
    phone: Joi.string().trim().allow(""),
    logoUrl: Joi.string().trim().allow(""),
    currency: Joi.string().trim().uppercase(),
    invoicePrefix: Joi.string().trim().max(12),
    creditNotePrefix: Joi.string().trim().max(12),
    jobPrefix: Joi.string().trim().max(12),
    paymentPrefix: Joi.string().trim().max(12),
    defaultDueDays: Joi.number().integer().min(0).max(365),
    defaultTaxRateId: objectId.allow(null, ""),
    paymentTerms: Joi.string().trim().allow(""),
    bankName: Joi.string().trim().allow(""),
    bankAccount: Joi.string().trim().allow(""),
    bankIfsc: Joi.string().trim().allow(""),
    upiId: Joi.string().trim().allow(""),
    paymentFooter: Joi.string().trim().allow(""),
    reminderDays: Joi.array().items(Joi.number().integer().min(0).max(120)),
  }).required(),
});

const listTaxRates = Joi.object({
  query: Joi.object({ ...paging, active: Joi.string().valid("true", "false") }),
});

const taxRateBody = {
  name: Joi.string().trim().min(2).max(80),
  code: Joi.string().trim().min(1).max(20),
  rate: Joi.number().min(0).max(100),
  isActive: Joi.boolean(),
  isDefault: Joi.boolean(),
};

const createTaxRate = Joi.object({
  body: Joi.object({
    ...taxRateBody,
    name: taxRateBody.name.required(),
    code: taxRateBody.code.required(),
    rate: taxRateBody.rate.required(),
  }).required(),
});

const updateTaxRate = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object(taxRateBody).required(),
});

const listOfferings = Joi.object({
  query: Joi.object({
    ...paging,
    category: Joi.string().valid(...SERVICE_CATEGORIES),
    active: Joi.string().valid("true", "false"),
    documentKey: Joi.string().allow(""),
  }),
});

const offeringBody = {
  code: Joi.string().trim().min(2).max(40),
  name: Joi.string().trim().min(2).max(160),
  category: Joi.string().valid(...SERVICE_CATEGORIES),
  description: Joi.string().trim().allow(""),
  isActive: Joi.boolean(),
  unitPrice: Joi.number().min(0),
  costPrice: Joi.number().min(0),
  currency: Joi.string().trim().uppercase(),
  taxRateId: objectId.allow(null, ""),
  slaDays: Joi.number().integer().min(0),
  formDefinitionId: objectId.allow(null, ""),
  documentKey: Joi.string().trim().allow(""),
  hsnSac: Joi.string().trim().allow(""),
};

const createOffering = Joi.object({
  body: Joi.object({
    ...offeringBody,
    code: offeringBody.code.required(),
    name: offeringBody.name.required(),
  }).required(),
});

const updateOffering = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object(offeringBody).required(),
});

const listJobs = Joi.object({
  query: Joi.object({
    ...paging,
    status: Joi.string().valid(...JOB_STATUSES),
    leadId: objectId,
    assigneeId: objectId,
    source: Joi.string().valid(...JOB_SOURCES),
    documentKey: Joi.string().allow(""),
    open: Joi.string().valid("true", "false"),
  }),
});

const gapsQuery = Joi.object({
  query: Joi.object({
    leadId: objectId.required(),
  }).required(),
});

const createJob = Joi.object({
  body: Joi.object({
    leadId: objectId.required(),
    assigneeId: objectId.allow(null, ""),
    source: Joi.string().valid(...JOB_SOURCES),
    dueAt: date.allow(null, ""),
    notes: Joi.string().trim().allow(""),
    verificationCaseId: objectId.allow(null, ""),
    discount: Joi.number().min(0),
    slaDays: Joi.number().min(0),
    lines: Joi.array().items(lineSchema).min(1).required(),
  }).required(),
});

const updateJob = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    leadId: objectId,
    assigneeId: objectId.allow(null, ""),
    dueAt: date.allow(null, ""),
    notes: Joi.string().trim().allow(""),
    discount: Joi.number().min(0),
    lines: Joi.array().items(lineSchema).min(1),
  }).required(),
});

const jobAction = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    note: Joi.string().trim().allow(""),
    waivePayment: Joi.boolean(),
    files: Joi.array().items(fileSchema),
  }),
});

const listInvoices = Joi.object({
  query: Joi.object({
    ...paging,
    status: Joi.string().valid(...INVOICE_STATUSES),
    type: Joi.string().valid(...INVOICE_TYPES),
    leadId: objectId,
    jobId: objectId,
  }),
});

const createInvoice = Joi.object({
  body: Joi.object({
    leadId: objectId.required(),
    jobId: objectId.allow(null, ""),
    billTo: billToSchema,
    placeOfSupply: Joi.string().trim().allow(""),
    notes: Joi.string().trim().allow(""),
    paymentTerms: Joi.string().trim().allow(""),
    discount: Joi.number().min(0),
    dueAt: date.allow(null, ""),
    lines: Joi.array().items(lineSchema),
  }).required(),
});

const updateInvoice = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    billTo: billToSchema,
    placeOfSupply: Joi.string().trim().allow(""),
    notes: Joi.string().trim().allow(""),
    paymentTerms: Joi.string().trim().allow(""),
    discount: Joi.number().min(0),
    dueAt: date.allow(null, ""),
    lines: Joi.array().items(lineSchema).min(1),
  }).required(),
});

const creditNote = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    notes: Joi.string().trim().allow(""),
    discount: Joi.number().min(0),
    lines: Joi.array().items(lineSchema),
  }),
});

const listPayments = Joi.object({
  query: Joi.object({
    ...paging,
    status: Joi.string().valid(...PAYMENT_STATUSES),
    method: Joi.string().valid(...PAYMENT_METHODS),
    invoiceId: objectId,
    leadId: objectId,
  }),
});

const instrumentSchema = Joi.object({
  transactionId: Joi.string().trim().allow(""),
  bankName: Joi.string().trim().allow(""),
  ifsc: Joi.string().trim().allow(""),
  accountName: Joi.string().trim().allow(""),
  upiVpa: Joi.string().trim().allow(""),
  chequeNumber: Joi.string().trim().allow(""),
  chequeDate: date.allow(null, ""),
  chequeBank: Joi.string().trim().allow(""),
  depositedTo: Joi.string().trim().allow(""),
});

const createPayment = Joi.object({
  body: Joi.object({
    invoiceId: objectId.required(),
    amount: Joi.number().min(0.01).required(),
    method: Joi.string().valid(...PAYMENT_METHODS),
    paidAt: date,
    reference: Joi.string().trim().allow(""),
    notes: Joi.string().trim().allow(""),
    receivedBy: Joi.string().trim().allow(""),
    receivedFrom: billToSchema,
    instrument: instrumentSchema,
    files: Joi.array().items(fileSchema),
  }).required(),
});

module.exports = {
  idParam,
  updateSettings,
  listTaxRates,
  createTaxRate,
  updateTaxRate,
  listOfferings,
  createOffering,
  updateOffering,
  listJobs,
  gapsQuery,
  createJob,
  updateJob,
  jobAction,
  listInvoices,
  createInvoice,
  updateInvoice,
  creditNote,
  listPayments,
  createPayment,
};

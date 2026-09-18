const Joi = require("joi");
const { FORM_PURPOSES, SUBMISSION_STATUSES, ONBOARDING_SUBJECT_TYPES } = require("../../constants/forms");

const objectId = Joi.string().hex().length(24);

const mixedArray = Joi.array().items(Joi.object().unknown(true));

const listSchema = Joi.object({
  query: Joi.object({
    search: Joi.string().allow(""),
    status: Joi.string().valid("draft", "published", "archived"),
    purpose: Joi.string().valid(...FORM_PURPOSES),
    sort: Joi.string(),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }),
});

const idParamSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
});

const createSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().min(2).max(160).required(),
    description: Joi.string().trim().allow("").max(2000),
    template: Joi.string().valid("blank", "supplier_onboarding", "frozen_food_permit"),
    purpose: Joi.string().valid(...FORM_PURPOSES),
  }).required(),
});

const updateSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    name: Joi.string().trim().min(2).max(160),
    description: Joi.string().trim().allow("").max(2000),
    purpose: Joi.string().valid(...FORM_PURPOSES),
  }).required(),
});

const draftSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    name: Joi.string().trim().min(2).max(160),
    description: Joi.string().trim().allow("").max(2000),
    sections: mixedArray,
    fields: mixedArray,
    rules: mixedArray,
    documents: mixedArray,
    stages: mixedArray,
  }).required(),
});

const testRuleSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    ruleId: Joi.string().required(),
    values: Joi.object().unknown(true).default({}),
    versionId: objectId,
  }).required(),
});

const submitSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    values: Joi.object().unknown(true).default({}),
    versionId: objectId,
    subjectType: Joi.string().valid(...ONBOARDING_SUBJECT_TYPES),
    subjectId: objectId,
    status: Joi.string().valid("draft", "submitted"),
  }).required(),
});

const publishSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    allowWarnings: Joi.boolean().default(true),
  }).default({}),
});

const onboardingListSchema = Joi.object({
  query: Joi.object({
    search: Joi.string().allow(""),
    status: Joi.string().valid(...SUBMISSION_STATUSES),
    purpose: Joi.string().valid("supplier_onboarding", "distributor_onboarding"),
    subjectType: Joi.string().valid(...ONBOARDING_SUBJECT_TYPES),
    subjectId: objectId,
    sort: Joi.string(),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }),
});

const submissionIdSchema = Joi.object({
  params: Joi.object({ submissionId: objectId.required() }).required(),
});

const subjectParamSchema = Joi.object({
  params: Joi.object({
    subjectType: Joi.string().valid(...ONBOARDING_SUBJECT_TYPES).required(),
    subjectId: objectId.required(),
  }).required(),
});

const saveOnboardingSchema = Joi.object({
  params: Joi.object({ submissionId: objectId.required() }).required(),
  body: Joi.object({
    values: Joi.object().unknown(true).default({}),
  }).required(),
});

const reviewSchema = Joi.object({
  params: Joi.object({ submissionId: objectId.required() }).required(),
  body: Joi.object({
    decision: Joi.string().valid("approved", "rejected").required(),
    note: Joi.string().allow("").max(2000),
  }).required(),
});

module.exports = {
  listSchema,
  idParamSchema,
  createSchema,
  updateSchema,
  draftSchema,
  testRuleSchema,
  submitSchema,
  publishSchema,
  onboardingListSchema,
  submissionIdSchema,
  subjectParamSchema,
  saveOnboardingSchema,
  reviewSchema,
};

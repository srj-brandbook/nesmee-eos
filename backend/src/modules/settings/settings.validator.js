const Joi = require("joi");

const updateSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().min(2).max(80),
    supportEmail: Joi.string().trim().email(),
    signupEnabled: Joi.boolean(),
    maintenanceMode: Joi.boolean(),
    legalName: Joi.string().trim().allow("").max(160),
    address: Joi.string().trim().allow("").max(500),
    city: Joi.string().trim().allow("").max(80),
    state: Joi.string().trim().allow("").max(80),
    pincode: Joi.string().trim().allow("").max(20),
    country: Joi.string().trim().allow("").max(80),
    gstin: Joi.string().trim().allow("").max(20),
    logoUrl: Joi.string().trim().allow("").max(500),
    logoPublicId: Joi.string().trim().allow("").max(200),
    signatoryName: Joi.string().trim().allow("").max(160),
    signatoryTitle: Joi.string().trim().allow("").max(160),
  }).required(),
});

module.exports = { updateSchema };

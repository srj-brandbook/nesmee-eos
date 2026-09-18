const Joi = require("joi");

const updateSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().min(2).max(80),
    supportEmail: Joi.string().trim().email(),
    signupEnabled: Joi.boolean(),
    maintenanceMode: Joi.boolean(),
  }).required(),
});

module.exports = { updateSchema };

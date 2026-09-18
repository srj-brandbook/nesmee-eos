const Joi = require("joi");

const updateSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().min(2).max(80),
    avatarUrl: Joi.string().allow(""),
    avatarPublicId: Joi.string().allow(""),
    notifyInApp: Joi.boolean(),
  }).required(),
});

module.exports = { updateSchema };

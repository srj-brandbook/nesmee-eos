const Joi = require("joi");

const folder = Joi.string().trim().required();
const resourceType = Joi.string().valid("image", "raw", "auto", "video");

const signSchema = Joi.object({
  body: Joi.object({
    folder,
    resourceType,
    publicId: Joi.string().trim().allow(""),
  }).required(),
});

const destroySchema = Joi.object({
  body: Joi.object({
    publicId: Joi.string().trim().required(),
    resourceType,
  }).required(),
});

module.exports = { signSchema, destroySchema };

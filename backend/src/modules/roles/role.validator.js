const Joi = require("joi");

const objectId = Joi.string().hex().length(24);

const listSchema = Joi.object({
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }),
});

const createSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().min(2).max(60).required(),
    slug: Joi.string().trim().lowercase(),
    description: Joi.string().allow(""),
    permissionIds: Joi.array().items(objectId),
  }).required(),
});

const updateSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    name: Joi.string().trim().min(2).max(60),
    description: Joi.string().allow(""),
    permissionIds: Joi.array().items(objectId),
  }).required(),
});

const permissionsSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    permissionIds: Joi.array().items(objectId).required(),
  }).required(),
});

const idParamSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
});

module.exports = { listSchema, createSchema, updateSchema, permissionsSchema, idParamSchema };

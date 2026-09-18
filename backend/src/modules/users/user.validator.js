const Joi = require("joi");

const objectId = Joi.string().hex().length(24);

const listSchema = Joi.object({
  query: Joi.object({
    search: Joi.string().allow(""),
    status: Joi.string().valid("pending_verification", "active", "disabled"),
    roleId: objectId,
    sort: Joi.string(),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }),
});

const createSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().min(2).max(80).required(),
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(8).max(128).required(),
    roleIds: Joi.array().items(objectId).default([]),
    status: Joi.string().valid("pending_verification", "active", "disabled"),
    avatarUrl: Joi.string().allow(""),
    avatarPublicId: Joi.string().allow(""),
  }).required(),
});

const updateSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    name: Joi.string().trim().min(2).max(80),
    avatarUrl: Joi.string().allow(""),
    avatarPublicId: Joi.string().allow(""),
    roleIds: Joi.array().items(objectId),
    status: Joi.string().valid("pending_verification", "active", "disabled"),
  }).required(),
});

const idParamSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
});

module.exports = { listSchema, createSchema, updateSchema, idParamSchema };

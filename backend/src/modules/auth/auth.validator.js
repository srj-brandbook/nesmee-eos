const Joi = require("joi");

const password = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Za-z]/)
  .pattern(/[0-9]/)
  .messages({
    "string.min": "Password must be at least 8 characters",
    "string.pattern.base": "Password must include a letter and a number",
  });

const signupSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().min(2).max(80).required(),
    email: Joi.string().trim().email().required(),
    password: password.required(),
  }).required(),
});

const loginSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().trim().email().required(),
    password: Joi.string().required(),
  }).required(),
});

const emailSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().trim().email().required(),
  }).required(),
});

const tokenSchema = Joi.object({
  body: Joi.object({
    token: Joi.string().required(),
  }).required(),
});

const resetPasswordSchema = Joi.object({
  body: Joi.object({
    token: Joi.string().required(),
    password: password.required(),
  }).required(),
});

const changePasswordSchema = Joi.object({
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: password.required(),
  }).required(),
});

module.exports = {
  signupSchema,
  loginSchema,
  emailSchema,
  tokenSchema,
  resetPasswordSchema,
  changePasswordSchema,
};

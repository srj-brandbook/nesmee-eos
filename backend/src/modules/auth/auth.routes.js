const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/authenticate");
const { authLimiter } = require("../../middleware/rateLimit");
const controller = require("./auth.controller");
const {
  signupSchema,
  loginSchema,
  emailSchema,
  tokenSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require("./auth.validator");

const router = express.Router();

router.post("/signup", authLimiter, validate(signupSchema), catchAsync(controller.signup));
router.post("/login", authLimiter, validate(loginSchema), catchAsync(controller.login));
router.post("/logout", authenticate, catchAsync(controller.logout));
router.get("/me", authenticate, catchAsync(controller.me));
router.post("/refresh", authLimiter, catchAsync(controller.refresh));
router.post("/verify-email", authLimiter, validate(tokenSchema), catchAsync(controller.verifyEmail));
router.post("/resend-verification", authLimiter, validate(emailSchema), catchAsync(controller.resendVerification));
router.post("/forgot-password", authLimiter, validate(emailSchema), catchAsync(controller.forgotPassword));
router.post("/reset-password", authLimiter, validate(resetPasswordSchema), catchAsync(controller.resetPassword));
router.post("/change-password", authenticate, validate(changePasswordSchema), catchAsync(controller.changePassword));

module.exports = router;

const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/authenticate");
const controller = require("./profile.controller");
const { updateSchema } = require("./profile.validator");

const router = express.Router();

router.use(authenticate);
router.get("/", catchAsync(controller.get));
router.patch("/", validate(updateSchema), catchAsync(controller.update));

module.exports = router;

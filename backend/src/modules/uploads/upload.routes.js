const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/authenticate");
const controller = require("./upload.controller");
const { signSchema, destroySchema } = require("./upload.validator");

const router = express.Router();

router.use(authenticate);
router.post("/signature", validate(signSchema), catchAsync(controller.signature));
router.post("/destroy", validate(destroySchema), catchAsync(controller.destroy));

module.exports = router;

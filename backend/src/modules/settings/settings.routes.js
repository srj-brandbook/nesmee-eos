const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/authenticate");
const { requirePermission } = require("../../middleware/requirePermission");
const controller = require("./settings.controller");
const { updateSchema } = require("./settings.validator");

const router = express.Router();

router.use(authenticate);
router.get("/", requirePermission("settings.view"), catchAsync(controller.get));
router.patch("/", requirePermission("settings.update"), validate(updateSchema), catchAsync(controller.update));

module.exports = router;

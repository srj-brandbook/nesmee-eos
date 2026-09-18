const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/authenticate");
const { requirePermission } = require("../../middleware/requirePermission");
const controller = require("./calendar.controller");
const { calendarQuerySchema } = require("../activities/activity.validator");

const router = express.Router();

router.use(authenticate);
router.get("/", requirePermission("calendar.view"), validate(calendarQuerySchema), catchAsync(controller.list));

module.exports = router;

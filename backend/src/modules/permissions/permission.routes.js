const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const { authenticate } = require("../../middleware/authenticate");
const { requirePermission } = require("../../middleware/requirePermission");
const controller = require("./permission.controller");

const router = express.Router();

router.get("/", authenticate, requirePermission("permissions.view"), catchAsync(controller.list));

module.exports = router;

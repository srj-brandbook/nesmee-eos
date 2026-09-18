const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const { authenticate } = require("../../middleware/authenticate");
const { requirePermission } = require("../../middleware/requirePermission");
const controller = require("./audit.controller");

const router = express.Router();

router.get("/", authenticate, requirePermission("audit.view"), catchAsync(controller.list));

module.exports = router;

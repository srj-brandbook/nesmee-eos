const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const { authenticate } = require("../../middleware/authenticate");
const controller = require("./dashboard.controller");

const router = express.Router();

router.use(authenticate);
router.get("/", catchAsync(controller.overview));

module.exports = router;

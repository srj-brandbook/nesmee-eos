const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const { authenticate } = require("../../middleware/authenticate");
const controller = require("./session.controller");

const router = express.Router();

router.use(authenticate);
router.get("/", catchAsync(controller.list));
router.delete("/", catchAsync(controller.revokeAll));
router.delete("/:id", catchAsync(controller.revoke));

module.exports = router;

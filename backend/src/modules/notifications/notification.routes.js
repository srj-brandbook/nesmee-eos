const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const { authenticate } = require("../../middleware/authenticate");
const controller = require("./notification.controller");

const router = express.Router();

router.use(authenticate);
router.get("/", catchAsync(controller.list));
router.post("/mark-all-read", catchAsync(controller.markAllRead));
router.patch("/:id/read", catchAsync(controller.markRead));

module.exports = router;

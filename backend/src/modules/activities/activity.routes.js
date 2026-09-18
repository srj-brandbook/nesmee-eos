const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/authenticate");
const { requirePermission } = require("../../middleware/requirePermission");
const controller = require("./activity.controller");
const { listSchema, createSchema, updateSchema, idParamSchema } = require("./activity.validator");

const router = express.Router();

router.use(authenticate);

router.get("/", requirePermission("activities.view"), validate(listSchema), catchAsync(controller.list));
router.post("/", requirePermission("activities.create"), validate(createSchema), catchAsync(controller.create));
router.get("/:id", requirePermission("activities.view"), validate(idParamSchema), catchAsync(controller.get));
router.patch("/:id", requirePermission("activities.update"), validate(updateSchema), catchAsync(controller.update));
router.delete("/:id", requirePermission("activities.delete"), validate(idParamSchema), catchAsync(controller.remove));

module.exports = router;

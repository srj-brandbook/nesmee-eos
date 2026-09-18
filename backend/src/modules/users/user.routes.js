const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/authenticate");
const { requirePermission } = require("../../middleware/requirePermission");
const controller = require("./user.controller");
const sessionController = require("../sessions/session.controller");
const { listSchema, createSchema, updateSchema, idParamSchema } = require("./user.validator");

const router = express.Router();

router.use(authenticate);

router.get("/", requirePermission("users.view"), validate(listSchema), catchAsync(controller.list));
router.post("/", requirePermission("users.create"), validate(createSchema), catchAsync(controller.create));
router.get("/:id/sessions", requirePermission("users.update"), catchAsync(sessionController.listForUser));
router.get("/:id", requirePermission("users.view"), validate(idParamSchema), catchAsync(controller.get));
router.patch("/:id", requirePermission("users.update"), validate(updateSchema), catchAsync(controller.update));
router.delete("/:id", requirePermission("users.delete"), validate(idParamSchema), catchAsync(controller.remove));
router.post("/:id/deactivate", requirePermission("users.update"), validate(idParamSchema), catchAsync(controller.deactivate));
router.post("/:id/activate", requirePermission("users.update"), validate(idParamSchema), catchAsync(controller.activate));
router.post("/:id/reset-password", requirePermission("users.update"), validate(idParamSchema), catchAsync(controller.resetPassword));

module.exports = router;

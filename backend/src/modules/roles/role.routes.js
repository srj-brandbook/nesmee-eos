const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/authenticate");
const { requirePermission } = require("../../middleware/requirePermission");
const controller = require("./role.controller");
const { listSchema, createSchema, updateSchema, permissionsSchema, idParamSchema } = require("./role.validator");

const router = express.Router();

router.use(authenticate);

router.get("/", requirePermission("roles.view"), validate(listSchema), catchAsync(controller.list));
router.post("/", requirePermission("roles.create"), validate(createSchema), catchAsync(controller.create));
router.get("/:id", requirePermission("roles.view"), validate(idParamSchema), catchAsync(controller.get));
router.patch("/:id", requirePermission("roles.update"), validate(updateSchema), catchAsync(controller.update));
router.put("/:id/permissions", requirePermission("roles.update"), validate(permissionsSchema), catchAsync(controller.setPermissions));
router.delete("/:id", requirePermission("roles.delete"), validate(idParamSchema), catchAsync(controller.remove));

module.exports = router;

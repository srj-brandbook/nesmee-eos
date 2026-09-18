const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/authenticate");
const { requirePermission } = require("../../middleware/requirePermission");
const controller = require("./lead.controller");
const {
  listSchema,
  createSchema,
  updateSchema,
  convertSchema,
  createContactSchema,
  updateContactSchema,
  contactParamSchema,
  idParamSchema,
} = require("./lead.validator");

const router = express.Router();

router.use(authenticate);

router.get("/", requirePermission("leads.view"), validate(listSchema), catchAsync(controller.list));
router.post("/", requirePermission("leads.create"), validate(createSchema), catchAsync(controller.create));
router.get("/assignees", requirePermission("leads.view"), catchAsync(controller.assignees));
router.get("/dashboard", requirePermission("leads.view"), catchAsync(controller.dashboard));
router.post("/:id/convert", requirePermission("leads.convert"), validate(convertSchema), catchAsync(controller.convert));
router.post("/:id/onboarding", requirePermission("leads.convert"), validate(idParamSchema), catchAsync(controller.startOnboarding));
router.post("/:id/contacts", requirePermission("leads.update"), validate(createContactSchema), catchAsync(controller.addContact));
router.patch(
  "/:id/contacts/:contactId",
  requirePermission("leads.update"),
  validate(updateContactSchema),
  catchAsync(controller.updateContact)
);
router.delete(
  "/:id/contacts/:contactId",
  requirePermission("leads.update"),
  validate(contactParamSchema),
  catchAsync(controller.removeContact)
);
router.get("/:id", requirePermission("leads.view"), validate(idParamSchema), catchAsync(controller.get));
router.patch("/:id", requirePermission("leads.update"), validate(updateSchema), catchAsync(controller.update));
router.delete("/:id", requirePermission("leads.delete"), validate(idParamSchema), catchAsync(controller.remove));

module.exports = router;

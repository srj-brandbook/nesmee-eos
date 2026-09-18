const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/authenticate");
const { requirePermission } = require("../../middleware/requirePermission");
const controller = require("./verification.controller");
const {
  listSchema,
  createSchema,
  saveSchema,
  idParamSchema,
  leadParamSchema,
  assignSchema,
  cancelSchema,
  updateDocumentSchema,
  reviewDocumentSchema,
  reviewCaseSchema,
} = require("./verification.validator");

const router = express.Router();

router.use(authenticate);

router.get("/templates", requirePermission("verification.view"), catchAsync(controller.listTemplates));
router.get("/assignees", requirePermission("verification.view"), catchAsync(controller.assignees));
router.get("/leads/:leadId/summary", requirePermission("verification.view"), validate(leadParamSchema), catchAsync(controller.summaryForLead));
router.get("/", requirePermission("verification.view"), validate(listSchema), catchAsync(controller.list));
router.post("/", requirePermission("verification.assign"), validate(createSchema), catchAsync(controller.create));
router.get("/:id", requirePermission("verification.view"), validate(idParamSchema), catchAsync(controller.get));
router.patch("/:id", requirePermission("verification.submit"), validate(saveSchema), catchAsync(controller.saveDraft));
router.post("/:id/submit", requirePermission("verification.submit"), validate(saveSchema), catchAsync(controller.submit));
router.post("/:id/review", requirePermission("verification.review"), validate(reviewCaseSchema), catchAsync(controller.reviewCase));
router.patch("/:id/assign", requirePermission("verification.assign"), validate(assignSchema), catchAsync(controller.reassign));
router.post("/:id/cancel", requirePermission("verification.assign"), validate(cancelSchema), catchAsync(controller.cancel));
router.patch("/documents/:id", requirePermission("verification.submit"), validate(updateDocumentSchema), catchAsync(controller.updateDocument));
router.post("/documents/:id/review", requirePermission("verification.review"), validate(reviewDocumentSchema), catchAsync(controller.reviewDocument));

module.exports = router;

const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/authenticate");
const { requirePermission } = require("../../middleware/requirePermission");
const controller = require("./document.controller");
const {
  templateListSchema,
  documentListSchema,
  idParamSchema,
  variablesSchema,
  createTemplateSchema,
  updateTemplateSchema,
  draftSchema,
  previewSchema,
  generateSchema,
  updateDocumentSchema,
  voidSchema,
  attachmentsSchema,
  fileKindSchema,
} = require("./document.validator");

const router = express.Router();

router.use(authenticate);

router.get("/variables", requirePermission("documents.view"), validate(variablesSchema), catchAsync(controller.variables));
router.post("/preview-bindings", requirePermission("documents.view"), validate(previewSchema), catchAsync(controller.previewBindings));

router.get("/templates", requirePermission("documents.view"), validate(templateListSchema), catchAsync(controller.listTemplates));
router.post("/templates", requirePermission("documents.create"), validate(createTemplateSchema), catchAsync(controller.createTemplate));
router.get("/templates/:id", requirePermission("documents.view"), validate(idParamSchema), catchAsync(controller.getTemplate));
router.patch("/templates/:id", requirePermission("documents.update"), validate(updateTemplateSchema), catchAsync(controller.updateTemplate));
router.delete("/templates/:id", requirePermission("documents.delete"), validate(idParamSchema), catchAsync(controller.removeTemplate));
router.patch("/templates/:id/draft", requirePermission("documents.update"), validate(draftSchema), catchAsync(controller.saveTemplateDraft));
router.post("/templates/:id/draft", requirePermission("documents.update"), validate(idParamSchema), catchAsync(controller.createTemplateDraft));
router.post("/templates/:id/publish", requirePermission("documents.publish"), validate(idParamSchema), catchAsync(controller.publishTemplate));

router.get("/", requirePermission("documents.view"), validate(documentListSchema), catchAsync(controller.list));
router.post("/", requirePermission("documents.create"), validate(generateSchema), catchAsync(controller.generate));
router.get("/:id", requirePermission("documents.view"), validate(idParamSchema), catchAsync(controller.get));
router.patch("/:id", requirePermission("documents.update"), validate(updateDocumentSchema), catchAsync(controller.update));
router.delete("/:id", requirePermission("documents.delete"), validate(idParamSchema), catchAsync(controller.remove));
router.post("/:id/rebind", requirePermission("documents.update"), validate(idParamSchema), catchAsync(controller.rebind));
router.get("/:id/print", requirePermission("documents.view"), validate(idParamSchema), catchAsync(controller.print));
router.post("/:id/issue", requirePermission("documents.issue"), validate(idParamSchema), catchAsync(controller.issue));
router.post("/:id/void", requirePermission("documents.issue"), validate(voidSchema), catchAsync(controller.voidDocument));
router.patch("/:id/attachments", requirePermission("documents.update"), validate(attachmentsSchema), catchAsync(controller.saveAttachments));
router.post("/:id/packet", requirePermission("documents.file"), validate(idParamSchema), catchAsync(controller.createPacket));
router.get("/:id/files/:kind", requirePermission("documents.view"), validate(fileKindSchema), catchAsync(controller.downloadFile));

module.exports = router;

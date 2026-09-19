const { success } = require("../../utils/ApiResponse");
const templateService = require("./template.service");
const documentService = require("./document.service");

async function variables(req, res) {
  const data = documentService.variables(req.query.subjectType);
  return success(res, { message: "Variables fetched", data });
}

async function previewBindings(req, res) {
  const data = await documentService.previewBindings(req.body, req.user);
  return success(res, { message: "Bindings previewed", data });
}

async function listTemplates(req, res) {
  const data = await templateService.list(req.query);
  return success(res, { message: "Templates fetched", data });
}

async function createTemplate(req, res) {
  const template = await templateService.create(req.body, req.user, req);
  return success(res, { message: "Template created", data: { template }, status: 201 });
}

async function getTemplate(req, res) {
  const template = await templateService.getById(req.params.id);
  return success(res, { message: "Template fetched", data: { template } });
}

async function updateTemplate(req, res) {
  const template = await templateService.update(req.params.id, req.body, req.user, req);
  return success(res, { message: "Template updated", data: { template } });
}

async function removeTemplate(req, res) {
  await templateService.remove(req.params.id, req.user, req);
  return success(res, { message: "Template deleted", data: null });
}

async function saveTemplateDraft(req, res) {
  const template = await templateService.saveDraft(req.params.id, req.body, req.user, req);
  return success(res, { message: "Draft saved", data: { template } });
}

async function createTemplateDraft(req, res) {
  const template = await templateService.createDraft(req.params.id, req.user, req);
  return success(res, { message: "Draft created", data: { template } });
}

async function publishTemplate(req, res) {
  const template = await templateService.publish(req.params.id, req.user, req);
  return success(res, { message: "Template published", data: { template } });
}

async function list(req, res) {
  const data = await documentService.list(req.query);
  return success(res, { message: "Documents fetched", data });
}

async function generate(req, res) {
  const document = await documentService.generate(req.body, req.user, req);
  return success(res, { message: "Document generated", data: { document }, status: 201 });
}

async function get(req, res) {
  const document = await documentService.getById(req.params.id);
  return success(res, { message: "Document fetched", data: { document } });
}

async function update(req, res) {
  const document = await documentService.update(req.params.id, req.body, req.user, req);
  return success(res, { message: "Document saved", data: { document } });
}

async function rebind(req, res) {
  const document = await documentService.rebind(req.params.id, req.user, req);
  return success(res, { message: "Values refreshed", data: { document } });
}

async function remove(req, res) {
  await documentService.remove(req.params.id, req.user, req);
  return success(res, { message: "Document deleted", data: null });
}

async function print(req, res) {
  const data = await documentService.print(req.params.id);
  return success(res, { message: "Print payload fetched", data });
}

async function issue(req, res) {
  const document = await documentService.issue(req.params.id, req.user, req);
  return success(res, { message: "Document issued", data: { document } });
}

async function voidDocument(req, res) {
  const document = await documentService.voidDocument(req.params.id, req.body || {}, req.user, req);
  return success(res, { message: "Document voided", data: { document } });
}

async function saveAttachments(req, res) {
  const document = await documentService.saveAttachments(req.params.id, req.body, req.user, req);
  return success(res, { message: "Attachments saved", data: { document } });
}

async function createPacket(req, res) {
  const document = await documentService.createPacket(req.params.id, req.user, req);
  return success(res, { message: "Filing packet created", data: { document } });
}

async function downloadFile(req, res) {
  const { buffer, filename } = await documentService.downloadFile(req.params.id, req.params.kind);
  const safeName = String(filename || "document.pdf").replace(/["\r\n]/g, "");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).send(buffer);
}

module.exports = {
  variables,
  previewBindings,
  listTemplates,
  createTemplate,
  getTemplate,
  updateTemplate,
  removeTemplate,
  saveTemplateDraft,
  createTemplateDraft,
  publishTemplate,
  list,
  generate,
  get,
  update,
  rebind,
  remove,
  print,
  issue,
  voidDocument,
  saveAttachments,
  createPacket,
  downloadFile,
};

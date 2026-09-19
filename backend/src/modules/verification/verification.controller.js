const { success } = require("../../utils/ApiResponse");
const verificationService = require("./verification.service");

async function listTemplates(req, res) {
  const items = await verificationService.listTemplates(req.query);
  return success(res, { message: "Verification templates fetched", data: { items } });
}

async function assignees(req, res) {
  const items = await verificationService.assignees();
  return success(res, { message: "Assignees fetched", data: { items } });
}

async function list(req, res) {
  const data = await verificationService.list(req.query, req);
  return success(res, { message: "Verification cases fetched", data });
}

async function create(req, res) {
  const item = await verificationService.create(req.body, req.user, req);
  return success(res, { message: "Verification assigned", data: { case: item }, status: 201 });
}

async function get(req, res) {
  const item = await verificationService.getById(req.params.id, req);
  return success(res, { message: "Verification case fetched", data: { case: item } });
}

async function saveDraft(req, res) {
  const item = await verificationService.saveDraft(req.params.id, req.body, req.user, req);
  return success(res, { message: "Draft saved", data: { case: item } });
}

async function submit(req, res) {
  const item = await verificationService.submit(req.params.id, req.body, req.user, req);
  return success(res, { message: "Verification submitted", data: { case: item } });
}

async function reassign(req, res) {
  const item = await verificationService.reassign(req.params.id, req.body, req.user, req);
  return success(res, { message: "Verification reassigned", data: { case: item } });
}

async function cancel(req, res) {
  const item = await verificationService.cancel(req.params.id, req.body || {}, req.user, req);
  return success(res, { message: "Verification cancelled", data: { case: item } });
}

async function updateDocument(req, res) {
  const data = await verificationService.updateDocument(req.params.id, req.body, req.user, req);
  return success(res, { message: "Document updated", data });
}

async function reviewDocument(req, res) {
  const data = await verificationService.reviewDocument(req.params.id, req.body, req.user, req);
  return success(res, { message: "Document reviewed", data });
}

async function reviewCase(req, res) {
  const item = await verificationService.reviewCase(req.params.id, req.body, req.user, req);
  return success(res, { message: req.body.decision === "verified" ? "Verification approved" : "Verification returned", data: { case: item } });
}

async function summaryForLead(req, res) {
  const data = await verificationService.summaryForLead(req.params.leadId, req);
  return success(res, { message: "Supplier verification fetched", data });
}

async function summaryForProduct(req, res) {
  const data = await verificationService.summaryForProduct(req.params.productId, req);
  return success(res, { message: "Product verification fetched", data });
}

module.exports = {
  listTemplates,
  assignees,
  list,
  create,
  get,
  saveDraft,
  submit,
  reassign,
  cancel,
  updateDocument,
  reviewDocument,
  reviewCase,
  summaryForLead,
  summaryForProduct,
};

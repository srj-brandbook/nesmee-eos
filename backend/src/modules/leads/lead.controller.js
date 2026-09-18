const { success } = require("../../utils/ApiResponse");
const leadService = require("./lead.service");

async function list(req, res) {
  const data = await leadService.list(req.query);
  return success(res, { message: "Leads fetched", data });
}

async function create(req, res) {
  const lead = await leadService.create(req.body, req.user, req);
  return success(res, { message: "Lead created", data: { lead }, status: 201 });
}

async function get(req, res) {
  const lead = await leadService.getById(req.params.id);
  return success(res, { message: "Lead fetched", data: { lead } });
}

async function update(req, res) {
  const lead = await leadService.update(req.params.id, req.body, req.user, req);
  return success(res, { message: "Lead updated", data: { lead } });
}

async function convert(req, res) {
  const data = await leadService.convert(req.params.id, req.body || {}, req.user, req);
  return success(res, { message: "Lead updated", data });
}

async function startOnboarding(req, res) {
  const data = await leadService.startOnboarding(req.params.id, req.user, req);
  return success(res, { message: "Onboarding started", data });
}

async function remove(req, res) {
  await leadService.remove(req.params.id, req.user, req);
  return success(res, { message: "Lead deleted", data: null });
}

async function addContact(req, res) {
  const contact = await leadService.addContact(req.params.id, req.body, req.user, req);
  return success(res, { message: "Contact added", data: { contact }, status: 201 });
}

async function updateContact(req, res) {
  const contact = await leadService.updateContact(req.params.id, req.params.contactId, req.body, req.user, req);
  return success(res, { message: "Contact updated", data: { contact } });
}

async function removeContact(req, res) {
  await leadService.removeContact(req.params.id, req.params.contactId, req.user, req);
  return success(res, { message: "Contact deleted", data: null });
}

async function assignees(req, res) {
  const items = await leadService.assignees();
  return success(res, { message: "Assignees fetched", data: { items } });
}

async function dashboard(req, res) {
  const data = await leadService.dashboard();
  return success(res, { message: "Sourcing dashboard fetched", data });
}

module.exports = {
  list,
  create,
  get,
  update,
  convert,
  startOnboarding,
  remove,
  addContact,
  updateContact,
  removeContact,
  assignees,
  dashboard,
};

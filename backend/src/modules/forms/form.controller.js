const { success } = require("../../utils/ApiResponse");
const formService = require("./form.service");
const onboardingService = require("./onboarding.service");

async function list(req, res) {
  const data = await formService.list(req.query);
  return success(res, { message: "Forms fetched", data });
}

async function create(req, res) {
  const form = await formService.create(req.body, req.user, req);
  return success(res, { message: "Form created", data: { form }, status: 201 });
}

async function get(req, res) {
  const form = await formService.getById(req.params.id);
  return success(res, { message: "Form fetched", data: { form } });
}

async function update(req, res) {
  const form = await formService.update(req.params.id, req.body, req.user, req);
  return success(res, { message: "Form updated", data: { form } });
}

async function remove(req, res) {
  await formService.remove(req.params.id, req.user, req);
  return success(res, { message: "Form deleted", data: null });
}

async function saveDraft(req, res) {
  const form = await formService.saveDraft(req.params.id, req.body, req.user, req);
  return success(res, { message: "Draft saved", data: { form } });
}

async function createDraft(req, res) {
  const form = await formService.createDraft(req.params.id, req.user, req);
  return success(res, { message: "Draft created", data: { form } });
}

async function publish(req, res) {
  const data = await formService.publish(req.params.id, req.body || {}, req.user, req);
  return success(res, { message: "Form published", data });
}

async function validateConfig(req, res) {
  const validation = await formService.validateConfig(req.params.id);
  return success(res, { message: "Configuration validated", data: { validation } });
}

async function testRule(req, res) {
  const result = await formService.testRule(req.params.id, req.body);
  return success(res, { message: "Rule tested", data: { result } });
}

async function createSubmission(req, res) {
  const submission = await formService.createSubmission(req.params.id, req.body, req.user, req);
  return success(res, { message: "Submission saved", data: { submission }, status: 201 });
}

async function listSubmissions(req, res) {
  const data = await formService.listSubmissions(req.params.id, req.query);
  return success(res, { message: "Submissions fetched", data });
}

async function listOnboarding(req, res) {
  const data = await onboardingService.list(req.query);
  return success(res, { message: "Onboarding fetched", data });
}

async function getOnboarding(req, res) {
  const onboarding = await onboardingService.getById(req.params.submissionId, req);
  return success(res, { message: "Onboarding fetched", data: { onboarding } });
}

async function getSubjectOnboarding(req, res) {
  const data = await onboardingService.getForSubject(req.params.subjectType, req.params.subjectId, req);
  return success(res, { message: "Onboarding fetched", data });
}

async function saveOnboardingDraft(req, res) {
  const onboarding = await onboardingService.saveDraft(req.params.submissionId, req.body, req.user, req);
  return success(res, { message: "Draft saved", data: { onboarding } });
}

async function submitOnboarding(req, res) {
  const onboarding = await onboardingService.submit(req.params.submissionId, req.body, req.user, req);
  return success(res, { message: "Onboarding submitted", data: { onboarding } });
}

async function reviewOnboarding(req, res) {
  const onboarding = await onboardingService.review(req.params.submissionId, req.body, req.user, req);
  return success(res, { message: "Onboarding reviewed", data: { onboarding } });
}

module.exports = {
  list,
  create,
  get,
  update,
  remove,
  saveDraft,
  createDraft,
  publish,
  validateConfig,
  testRule,
  createSubmission,
  listSubmissions,
  listOnboarding,
  getOnboarding,
  getSubjectOnboarding,
  saveOnboardingDraft,
  submitOnboarding,
  reviewOnboarding,
};

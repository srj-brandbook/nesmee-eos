const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/authenticate");
const { requirePermission, requireVerified } = require("../../middleware/requirePermission");
const controller = require("./form.controller");
const {
  listSchema,
  createSchema,
  updateSchema,
  draftSchema,
  idParamSchema,
  publishSchema,
  testRuleSchema,
  submitSchema,
  onboardingListSchema,
  submissionIdSchema,
  subjectParamSchema,
  saveOnboardingSchema,
  reviewSchema,
} = require("./form.validator");

const router = express.Router();

router.use(authenticate);

router.get("/", requirePermission("forms.view"), validate(listSchema), catchAsync(controller.list));
router.post("/", requirePermission("forms.create"), validate(createSchema), catchAsync(controller.create));
router.get("/onboarding", requirePermission("forms.view"), validate(onboardingListSchema), catchAsync(controller.listOnboarding));
router.get(
  "/onboarding/subject/:subjectType/:subjectId",
  requireVerified,
  validate(subjectParamSchema),
  catchAsync(controller.getSubjectOnboarding)
);
router.get("/onboarding/:submissionId", requireVerified, validate(submissionIdSchema), catchAsync(controller.getOnboarding));
router.patch("/onboarding/:submissionId", requireVerified, validate(saveOnboardingSchema), catchAsync(controller.saveOnboardingDraft));
router.post("/onboarding/:submissionId/submit", requireVerified, validate(saveOnboardingSchema), catchAsync(controller.submitOnboarding));
router.post("/onboarding/:submissionId/review", requireVerified, validate(reviewSchema), catchAsync(controller.reviewOnboarding));
router.get("/:id", requirePermission("forms.view"), validate(idParamSchema), catchAsync(controller.get));
router.patch("/:id", requirePermission("forms.update"), validate(updateSchema), catchAsync(controller.update));
router.delete("/:id", requirePermission("forms.delete"), validate(idParamSchema), catchAsync(controller.remove));
router.patch("/:id/draft", requirePermission("forms.update"), validate(draftSchema), catchAsync(controller.saveDraft));
router.post("/:id/draft", requirePermission("forms.update"), validate(idParamSchema), catchAsync(controller.createDraft));
router.post("/:id/publish", requirePermission("forms.publish"), validate(publishSchema), catchAsync(controller.publish));
router.post("/:id/validate-config", requirePermission("forms.view"), validate(idParamSchema), catchAsync(controller.validateConfig));
router.post("/:id/rules/test", requirePermission("forms.view"), validate(testRuleSchema), catchAsync(controller.testRule));
router.get("/:id/submissions", requirePermission("forms.view"), validate(idParamSchema), catchAsync(controller.listSubmissions));
router.post("/:id/submissions", requirePermission("forms.submit"), validate(submitSchema), catchAsync(controller.createSubmission));

module.exports = router;

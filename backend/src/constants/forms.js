const FORM_STATUSES = ["draft", "published", "archived"];
const VERSION_STATUSES = ["draft", "published", "archived"];
const FORM_PURPOSES = ["general", "supplier_onboarding", "distributor_onboarding", "supplier_verification"];
const ONBOARDING_SUBJECT_TYPES = ["lead", "buyer"];
const SUBMISSION_STATUSES = ["draft", "submitted", "approved", "rejected"];
const OPEN_SUBMISSION_STATUSES = ["draft", "submitted"];

const FORMS_PERMISSIONS = [
  { name: "forms.view", module: "forms", action: "view", description: "View forms" },
  { name: "forms.create", module: "forms", action: "create", description: "Create forms" },
  { name: "forms.update", module: "forms", action: "update", description: "Update form drafts" },
  { name: "forms.delete", module: "forms", action: "delete", description: "Delete forms" },
  { name: "forms.publish", module: "forms", action: "publish", description: "Publish form versions" },
  { name: "forms.submit", module: "forms", action: "submit", description: "Submit published forms" },
];

const FORMS_PERMISSION_NAMES = FORMS_PERMISSIONS.map((item) => item.name);

module.exports = {
  FORM_STATUSES,
  VERSION_STATUSES,
  FORM_PURPOSES,
  ONBOARDING_SUBJECT_TYPES,
  SUBMISSION_STATUSES,
  OPEN_SUBMISSION_STATUSES,
  FORMS_PERMISSIONS,
  FORMS_PERMISSION_NAMES,
};

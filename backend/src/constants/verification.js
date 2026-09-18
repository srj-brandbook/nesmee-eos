const VERIFICATION_CASE_STATUSES = [
  "assigned",
  "in_progress",
  "submitted",
  "verified",
  "rejected",
  "cancelled",
  "expired",
];

const OPEN_VERIFICATION_STATUSES = ["assigned", "in_progress", "submitted", "rejected", "expired"];
const FILLABLE_CASE_STATUSES = ["assigned", "in_progress", "rejected", "expired"];
const REVIEWABLE_CASE_STATUSES = ["submitted"];
const BLOCKING_CASE_STATUSES = ["assigned", "in_progress", "submitted", "rejected", "expired"];
const ASSIGNABLE_LEAD_STAGES = ["converted", "won"];

const VERIFICATION_DOCUMENT_STATUSES = ["pending_upload", "submitted", "verified", "rejected", "expired"];
const DOCUMENT_REVIEW_ACTIONS = ["verified", "rejected"];
const CASE_REVIEW_ACTIONS = ["verified", "rejected"];

const LEAD_VERIFICATION_STATUSES = ["none", "pending", "verified", "rejected", "expired"];

const EXPIRING_SOON_DAYS = 30;
const EXPIRY_NOTICE_WINDOWS = [30, 7, 0];

const VERIFICATION_PERMISSIONS = [
  { name: "verification.view", module: "verification", action: "view", description: "View supplier verification cases and documents" },
  { name: "verification.assign", module: "verification", action: "assign", description: "Assign verification forms to suppliers and staff" },
  { name: "verification.submit", module: "verification", action: "submit", description: "Fill and submit assigned verification cases" },
  { name: "verification.review", module: "verification", action: "review", description: "Review documents and approve or return submitted verification cases" },
];

const VERIFICATION_PERMISSION_NAMES = VERIFICATION_PERMISSIONS.map((item) => item.name);
const COMPLIANCE_VERIFICATION_PERMISSIONS = VERIFICATION_PERMISSION_NAMES;
const SALES_VERIFICATION_PERMISSIONS = ["verification.view", "verification.submit"];

module.exports = {
  VERIFICATION_CASE_STATUSES,
  OPEN_VERIFICATION_STATUSES,
  FILLABLE_CASE_STATUSES,
  REVIEWABLE_CASE_STATUSES,
  BLOCKING_CASE_STATUSES,
  ASSIGNABLE_LEAD_STAGES,
  VERIFICATION_DOCUMENT_STATUSES,
  DOCUMENT_REVIEW_ACTIONS,
  CASE_REVIEW_ACTIONS,
  LEAD_VERIFICATION_STATUSES,
  EXPIRING_SOON_DAYS,
  EXPIRY_NOTICE_WINDOWS,
  VERIFICATION_PERMISSIONS,
  VERIFICATION_PERMISSION_NAMES,
  COMPLIANCE_VERIFICATION_PERMISSIONS,
  SALES_VERIFICATION_PERMISSIONS,
};

export const VERIFICATION_CASE_STATUSES = [
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In progress" },
  { value: "submitted", label: "Pending review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Returned" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

export const VERIFICATION_DOCUMENT_STATUSES = [
  { value: "pending_upload", label: "Awaiting upload" },
  { value: "submitted", label: "Pending review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Returned" },
  { value: "expired", label: "Expired" },
];

export const LEAD_VERIFICATION_STATUSES = [
  { value: "none", label: "Not started" },
  { value: "pending", label: "In progress" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Returned" },
  { value: "expired", label: "Expired" },
];

export const FILLABLE_CASE_STATUSES = ["assigned", "in_progress", "rejected", "expired"];
export const REVIEWABLE_CASE_STATUSES = ["submitted"];

export function labelFor(list, value) {
  return list.find((item) => item.value === value)?.label || value || "—";
}

export function verificationStatusVariant(status) {
  if (status === "verified") return "success";
  if (status === "submitted" || status === "pending" || status === "in_progress" || status === "assigned") return "warning";
  if (status === "rejected" || status === "expired") return "danger";
  return "default";
}

export const VERIFICATION_REVIEW_ACTIONS = [
  { value: "started", label: "Started" },
  { value: "uploaded", label: "File uploaded" },
  { value: "replaced", label: "File replaced" },
  { value: "submitted", label: "Submitted for review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Returned" },
  { value: "expired", label: "Expired" },
];

export function reviewActionLabel(action, scope = "document") {
  if (action === "verified") return scope === "case" ? "Verification approved" : "Document verified";
  if (action === "rejected") return scope === "case" ? "Verification returned" : "Document returned";
  if (action === "submitted") return "Submitted for review";
  if (action === "started") return "Verification started";
  if (action === "uploaded") return "File uploaded";
  if (action === "replaced") return "Previous file retained";
  if (action === "expired") return "Marked expired";
  return labelFor(VERIFICATION_REVIEW_ACTIONS, action);
}

export function documentReviewProgress(documents = []) {
  const required = documents.filter((item) => item.required);
  const pool = required.length ? required : documents;
  return {
    total: pool.length,
    verified: pool.filter((item) => item.status === "verified").length,
    returned: pool.filter((item) => item.status === "rejected").length,
    remaining: pool.filter((item) => item.status === "submitted" || item.status === "pending_upload").length,
  };
}

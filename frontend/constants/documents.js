export const DOCUMENT_TYPES = [
  { value: "proposal", label: "Proposal" },
  { value: "noc", label: "NOC" },
  { value: "letter", label: "Letter" },
  { value: "agreement", label: "Agreement" },
  { value: "custom", label: "Custom" },
];

export const DOCUMENT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "issued", label: "Issued" },
  { value: "filed", label: "Filed" },
  { value: "void", label: "Void" },
];

export const TEMPLATE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export const SUBJECT_TYPES = [
  { value: "lead", label: "Supplier" },
  { value: "buyer", label: "Buyer" },
  { value: "none", label: "No subject" },
];

export function labelFor(list, value) {
  return list.find((item) => item.value === value)?.label || value || "—";
}

export function statusVariant(status) {
  if (status === "published" || status === "issued" || status === "filed") return "success";
  if (status === "in_review") return "warning";
  if (status === "void" || status === "archived") return "danger";
  return "default";
}

export function isEditableStatus(status) {
  return status === "draft" || status === "in_review";
}

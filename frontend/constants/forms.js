export const FORM_PURPOSES = [
  { value: "general", label: "General" },
  { value: "supplier_onboarding", label: "Supplier onboarding" },
  { value: "distributor_onboarding", label: "Distributor onboarding" },
  { value: "supplier_verification", label: "Supplier verification" },
];

export const ONBOARDING_STATUSES = [
  { value: "draft", label: "In progress" },
  { value: "submitted", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export const ONBOARDING_PURPOSES = FORM_PURPOSES.filter(
  (item) => item.value === "supplier_onboarding" || item.value === "distributor_onboarding"
);

export function labelFor(list, value) {
  return list.find((item) => item.value === value)?.label || value || "—";
}

export function onboardingStatusVariant(status) {
  if (status === "approved") return "success";
  if (status === "submitted") return "warning";
  if (status === "rejected") return "danger";
  return "default";
}

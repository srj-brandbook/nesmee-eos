export const SERVICE_CATEGORIES = [
  { value: "certificate", label: "Certificate" },
  { value: "inspection", label: "Inspection" },
  { value: "documentation", label: "Documentation" },
  { value: "other", label: "Other" },
];

export const JOB_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In progress" },
  { value: "awaiting_authority", label: "Awaiting authority" },
  { value: "delivered", label: "Delivered" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

export const JOB_SOURCES = [
  { value: "manual", label: "Manual" },
  { value: "verification_gap", label: "Missing certificate" },
  { value: "expiry", label: "Expiry renewal" },
];

export const INVOICE_TYPES = [
  { value: "invoice", label: "Tax invoice" },
  { value: "credit_note", label: "Credit note" },
];

export const INVOICE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "issued", label: "Issued" },
  { value: "partial", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "void", label: "Void" },
];

export const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank transfer", hint: "IMPS / account transfer" },
  { value: "upi", label: "UPI", hint: "UPI ID and reference" },
  { value: "neft", label: "NEFT", hint: "NEFT UTR" },
  { value: "rtgs", label: "RTGS", hint: "RTGS UTR" },
  { value: "cheque", label: "Cheque", hint: "Cheque number and bank" },
  { value: "cash", label: "Cash", hint: "Received in person" },
  { value: "other", label: "Other", hint: "DD or other instrument" },
];

export const PAYMENT_STATUSES = [
  { value: "recorded", label: "Recorded" },
  { value: "reversed", label: "Reversed" },
];

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export function labelFor(list, value) {
  return list.find((item) => item.value === value)?.label || value || "—";
}

export function billingStatusVariant(status) {
  if (status === "paid" || status === "closed" || status === "recorded" || status === "delivered") return "success";
  if (status === "issued" || status === "confirmed" || status === "in_progress" || status === "awaiting_authority") return "warning";
  if (status === "overdue" || status === "void" || status === "cancelled" || status === "reversed") return "danger";
  if (status === "partial") return "primary";
  return "default";
}

export function formatInr(value, currency = "INR") {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

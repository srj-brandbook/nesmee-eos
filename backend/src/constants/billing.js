const SERVICE_CATEGORIES = ["certificate", "inspection", "documentation", "other"];

const JOB_STATUSES = ["draft", "confirmed", "in_progress", "awaiting_authority", "delivered", "closed", "cancelled"];
const OPEN_JOB_STATUSES = ["draft", "confirmed", "in_progress", "awaiting_authority", "delivered"];
const CANCELABLE_JOB_STATUSES = ["draft", "confirmed", "in_progress", "awaiting_authority"];
const JOB_SOURCES = ["manual", "verification_gap", "expiry"];

const INVOICE_TYPES = ["invoice", "credit_note"];
const INVOICE_STATUSES = ["draft", "issued", "partial", "paid", "overdue", "void"];
const ISSUED_INVOICE_STATUSES = ["issued", "partial", "paid", "overdue"];
const MUTABLE_INVOICE_STATUSES = ["draft"];

const PAYMENT_METHODS = ["bank_transfer", "upi", "neft", "rtgs", "cheque", "cash", "other"];
const PAYMENT_STATUSES = ["recorded", "reversed"];

const TAX_SPLIT = ["intra", "inter"];

const INDIAN_STATES = [
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

function permission(name, action, description) {
  return { name, module: "billing", action, description };
}

const BILLING_PERMISSIONS = [
  permission("services.view", "services.view", "View the service catalog"),
  permission("services.create", "services.create", "Create service catalog items"),
  permission("services.update", "services.update", "Update service catalog items"),
  permission("services.delete", "services.delete", "Delete service catalog items"),
  permission("services.jobs.view", "jobs.view", "View certificate and service jobs"),
  permission("services.jobs.create", "jobs.create", "Create service jobs for suppliers"),
  permission("services.jobs.update", "jobs.update", "Update service jobs"),
  permission("services.jobs.fulfill", "jobs.fulfill", "Advance and fulfill service jobs"),
  permission("invoices.view", "invoices.view", "View invoices and credit notes"),
  permission("invoices.create", "invoices.create", "Create draft invoices"),
  permission("invoices.update", "invoices.update", "Update draft invoices"),
  permission("invoices.issue", "invoices.issue", "Issue invoices"),
  permission("invoices.void", "invoices.void", "Void invoices"),
  permission("payments.view", "payments.view", "View payments"),
  permission("payments.create", "payments.create", "Record payments"),
  permission("payments.reverse", "payments.reverse", "Reverse payments"),
  permission("billing.settings.view", "settings.view", "View billing settings"),
  permission("billing.settings.update", "settings.update", "Update billing settings"),
  permission("billing.reports.view", "reports.view", "View billing reports"),
];

const BILLING_PERMISSION_NAMES = BILLING_PERMISSIONS.map((item) => item.name);

const FINANCE_BILLING_PERMISSIONS = [
  "services.view",
  "services.jobs.view",
  "invoices.view",
  "invoices.create",
  "invoices.update",
  "invoices.issue",
  "invoices.void",
  "payments.view",
  "payments.create",
  "payments.reverse",
  "billing.settings.view",
  "billing.reports.view",
];

const COMPLIANCE_BILLING_PERMISSIONS = [
  "services.view",
  "services.jobs.view",
  "services.jobs.update",
  "services.jobs.fulfill",
  "invoices.view",
];

const SALES_BILLING_PERMISSIONS = [
  "services.view",
  "services.jobs.view",
  "services.jobs.create",
  "services.jobs.update",
  "invoices.view",
];

module.exports = {
  SERVICE_CATEGORIES,
  JOB_STATUSES,
  OPEN_JOB_STATUSES,
  CANCELABLE_JOB_STATUSES,
  JOB_SOURCES,
  INVOICE_TYPES,
  INVOICE_STATUSES,
  ISSUED_INVOICE_STATUSES,
  MUTABLE_INVOICE_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  TAX_SPLIT,
  INDIAN_STATES,
  BILLING_PERMISSIONS,
  BILLING_PERMISSION_NAMES,
  FINANCE_BILLING_PERMISSIONS,
  COMPLIANCE_BILLING_PERMISSIONS,
  SALES_BILLING_PERMISSIONS,
};

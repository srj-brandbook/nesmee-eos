const DOCUMENT_TYPES = ["proposal", "noc", "letter", "agreement", "custom"];
const DOCUMENT_STATUSES = ["draft", "in_review", "issued", "filed", "void"];
const TEMPLATE_STATUSES = ["draft", "published", "archived"];
const VERSION_STATUSES = ["draft", "published", "archived"];
const SUBJECT_TYPES = ["lead", "buyer", "none"];
const EDITABLE_DOCUMENT_STATUSES = ["draft", "in_review"];

const TYPE_PREFIXES = {
  proposal: "PROP",
  noc: "NOC",
  letter: "LTR",
  agreement: "AGR",
  custom: "DOC",
};

const TYPE_LABELS = {
  proposal: "Proposal",
  noc: "No Objection Certificate",
  letter: "Letter",
  agreement: "Agreement",
  custom: "Document",
};

const DOCUMENTS_PERMISSIONS = [
  { name: "documents.view", module: "documents", action: "view", description: "View document templates and generated documents" },
  { name: "documents.create", module: "documents", action: "create", description: "Create templates and generate documents" },
  { name: "documents.update", module: "documents", action: "update", description: "Edit template drafts and document content" },
  { name: "documents.delete", module: "documents", action: "delete", description: "Delete templates and documents" },
  { name: "documents.publish", module: "documents", action: "publish", description: "Publish document templates" },
  { name: "documents.issue", module: "documents", action: "issue", description: "Issue official PDFs" },
  { name: "documents.file", module: "documents", action: "file", description: "Merge filing packets" },
];

const DOCUMENTS_PERMISSION_NAMES = DOCUMENTS_PERMISSIONS.map((item) => item.name);
const SALES_DOCUMENTS_PERMISSIONS = ["documents.view", "documents.create", "documents.update"];
const COMPLIANCE_DOCUMENTS_PERMISSIONS = DOCUMENTS_PERMISSION_NAMES;

const VARIABLE_CATALOG = [
  { path: "supplier.name", label: "Supplier name", group: "Supplier", subjectTypes: ["lead"] },
  { path: "supplier.legalName", label: "Legal name", group: "Supplier", subjectTypes: ["lead"] },
  { path: "supplier.email", label: "Email", group: "Supplier", subjectTypes: ["lead"] },
  { path: "supplier.phone", label: "Phone", group: "Supplier", subjectTypes: ["lead"] },
  { path: "supplier.website", label: "Website", group: "Supplier", subjectTypes: ["lead"] },
  { path: "supplier.country", label: "Country", group: "Supplier", subjectTypes: ["lead"] },
  { path: "supplier.city", label: "City", group: "Supplier", subjectTypes: ["lead"] },
  { path: "supplier.gstin", label: "GSTIN", group: "Supplier", subjectTypes: ["lead"] },
  { path: "supplier.billingState", label: "Billing state", group: "Supplier", subjectTypes: ["lead"] },
  { path: "supplier.billingAddress", label: "Billing address", group: "Supplier", subjectTypes: ["lead"] },
  { path: "supplier.pincode", label: "Pincode", group: "Supplier", subjectTypes: ["lead"] },
  { path: "supplier.products", label: "Products", group: "Supplier", subjectTypes: ["lead"] },
  { path: "supplier.certifications", label: "Certifications", group: "Supplier", subjectTypes: ["lead"] },
  { path: "supplier.moq", label: "MOQ", group: "Supplier", subjectTypes: ["lead"] },
  { path: "supplier.exportMarkets", label: "Export markets", group: "Supplier", subjectTypes: ["lead"] },
  { path: "buyer.name", label: "Buyer name", group: "Buyer", subjectTypes: ["buyer"] },
  { path: "buyer.legalName", label: "Legal name", group: "Buyer", subjectTypes: ["buyer"] },
  { path: "buyer.email", label: "Email", group: "Buyer", subjectTypes: ["buyer"] },
  { path: "buyer.phone", label: "Phone", group: "Buyer", subjectTypes: ["buyer"] },
  { path: "buyer.country", label: "Country", group: "Buyer", subjectTypes: ["buyer"] },
  { path: "buyer.city", label: "City", group: "Buyer", subjectTypes: ["buyer"] },
  { path: "buyer.segment", label: "Segment", group: "Buyer", subjectTypes: ["buyer"] },
  { path: "buyer.productInterest", label: "Product interest", group: "Buyer", subjectTypes: ["buyer"] },
  { path: "company.name", label: "Company name", group: "Company", subjectTypes: ["lead", "buyer", "none"] },
  { path: "company.legalName", label: "Legal name", group: "Company", subjectTypes: ["lead", "buyer", "none"] },
  { path: "company.supportEmail", label: "Support email", group: "Company", subjectTypes: ["lead", "buyer", "none"] },
  { path: "company.address", label: "Address", group: "Company", subjectTypes: ["lead", "buyer", "none"] },
  { path: "company.city", label: "City", group: "Company", subjectTypes: ["lead", "buyer", "none"] },
  { path: "company.state", label: "State", group: "Company", subjectTypes: ["lead", "buyer", "none"] },
  { path: "company.pincode", label: "Pincode", group: "Company", subjectTypes: ["lead", "buyer", "none"] },
  { path: "company.country", label: "Country", group: "Company", subjectTypes: ["lead", "buyer", "none"] },
  { path: "company.gstin", label: "GSTIN", group: "Company", subjectTypes: ["lead", "buyer", "none"] },
  { path: "company.signatoryName", label: "Signatory name", group: "Company", subjectTypes: ["lead", "buyer", "none"] },
  { path: "company.signatoryTitle", label: "Signatory title", group: "Company", subjectTypes: ["lead", "buyer", "none"] },
  { path: "issuer.name", label: "Issuer name", group: "Issuer", subjectTypes: ["lead", "buyer", "none"] },
  { path: "issuer.email", label: "Issuer email", group: "Issuer", subjectTypes: ["lead", "buyer", "none"] },
  { path: "doc.number", label: "Document number", group: "Document", subjectTypes: ["lead", "buyer", "none"] },
  { path: "doc.title", label: "Document title", group: "Document", subjectTypes: ["lead", "buyer", "none"] },
  { path: "doc.type", label: "Document type", group: "Document", subjectTypes: ["lead", "buyer", "none"] },
  { path: "doc.issuedAt", label: "Issue date", group: "Document", subjectTypes: ["lead", "buyer", "none"] },
  { path: "today", label: "Today", group: "Document", subjectTypes: ["lead", "buyer", "none"] },
];

const VARIABLE_MAP = Object.fromEntries(VARIABLE_CATALOG.map((item) => [item.path, item]));

function catalogForSubject(subjectType) {
  const type = SUBJECT_TYPES.includes(subjectType) ? subjectType : "none";
  return VARIABLE_CATALOG.filter((item) => item.subjectTypes.includes(type) || item.subjectTypes.includes("none"));
}

function emptyBlockNoteContent() {
  return [
    {
      id: "intro",
      type: "paragraph",
      props: { textColor: "default", backgroundColor: "default", textAlignment: "left" },
      content: [],
      children: [],
    },
  ];
}

function nextVersionLabel(version) {
  const [major, minor] = String(version || "1.0")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  return `${major || 1}.${(minor || 0) + 1}`;
}

function slugify(name, fallback = "template") {
  const slug = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

module.exports = {
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  TEMPLATE_STATUSES,
  VERSION_STATUSES,
  SUBJECT_TYPES,
  EDITABLE_DOCUMENT_STATUSES,
  TYPE_PREFIXES,
  TYPE_LABELS,
  DOCUMENTS_PERMISSIONS,
  DOCUMENTS_PERMISSION_NAMES,
  SALES_DOCUMENTS_PERMISSIONS,
  COMPLIANCE_DOCUMENTS_PERMISSIONS,
  VARIABLE_CATALOG,
  VARIABLE_MAP,
  catalogForSubject,
  emptyBlockNoteContent,
  nextVersionLabel,
  slugify,
};

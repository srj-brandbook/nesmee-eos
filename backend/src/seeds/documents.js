const crypto = require("crypto");
const DocumentTemplate = require("../models/DocumentTemplate");
const DocumentTemplateVersion = require("../models/DocumentTemplateVersion");
const { collectVariablesUsed } = require("../modules/documents/document.bindings");

function id() {
  return crypto.randomBytes(10).toString("hex");
}

function text(value, styles = {}) {
  return { type: "text", text: value, styles };
}

function variable(path, label) {
  return { type: "variable", props: { path, label, value: "", missing: false } };
}

function block(type, content, props = {}, children = []) {
  const node = {
    id: id(),
    type,
    props: {
      textColor: "default",
      backgroundColor: "default",
      textAlignment: props.textAlignment || "left",
      ...props,
    },
    children,
  };
  if (type === "pageBreak" || type === "signature") {
    node.content = undefined;
    return node;
  }
  node.content = Array.isArray(content) ? content : content == null ? [] : [text(String(content))];
  return node;
}

function nocContent() {
  return [
    block("heading", [text("No Objection Certificate")], { level: 1, textAlignment: "center" }),
    block("paragraph", [text("Document no. "), variable("doc.number", "Document number")], { textAlignment: "center" }),
    block("paragraph", [
      text("This is to certify that "),
      variable("company.legalName", "Company legal name"),
      text(" has no objection to "),
      variable("supplier.legalName", "Legal name"),
      text(" ("),
      variable("supplier.name", "Supplier name"),
      text(") of "),
      variable("supplier.city", "City"),
      text(", "),
      variable("supplier.country", "Country"),
      text(" participating in export and supply activities described below."),
    ]),
    block("heading", [text("Supplier identity")], { level: 2 }),
    block("paragraph", [text("GSTIN: "), variable("supplier.gstin", "GSTIN")]),
    block("paragraph", [text("Registered address: "), variable("supplier.billingAddress", "Billing address")]),
    block("paragraph", [text("Products: "), variable("supplier.products", "Products")]),
    block("heading", [text("Validity")], { level: 2 }),
    block("paragraph", [
      text("This certificate is issued on "),
      variable("today", "Today"),
      text(" by "),
      variable("issuer.name", "Issuer name"),
      text(" and remains valid unless withdrawn in writing."),
    ]),
    block("signature", [], { name: "", title: "" }),
    block("paragraph", [
      text("For "),
      variable("company.legalName", "Company legal name"),
      text(" — "),
      variable("company.signatoryName", "Signatory name"),
      text(", "),
      variable("company.signatoryTitle", "Signatory title"),
    ]),
  ];
}

function proposalContent() {
  return [
    block("heading", [text("Supply proposal")], { level: 1 }),
    block("paragraph", [text("Prepared for "), variable("supplier.name", "Supplier name"), text(" · "), variable("doc.number", "Document number")]),
    block("paragraph", [
      text("Dear "),
      variable("supplier.name", "Supplier name"),
      text(", thank you for the opportunity to support "),
      variable("supplier.legalName", "Legal name"),
      text(". This proposal outlines the recommended next steps for export-ready documentation, verification, and market introduction."),
    ]),
    block("heading", [text("Scope")], { level: 2 }),
    block("bulletListItem", [text("Supplier onboarding and compliance file")]),
    block("bulletListItem", [text("Document verification and gap closure")]),
    block("bulletListItem", [text("Buyer introduction support for "), variable("supplier.exportMarkets", "Export markets")]),
    block("heading", [text("Commercial notes")], { level: 2 }),
    block("paragraph", [
      text("Indicative MOQ: "),
      variable("supplier.moq", "MOQ"),
      text(". Product focus: "),
      variable("supplier.products", "Products"),
      text("."),
    ]),
    block("heading", [text("Validity")], { level: 2 }),
    block("paragraph", [
      text("This proposal is dated "),
      variable("today", "Today"),
      text(" and is valid for 30 days. Issued by "),
      variable("issuer.name", "Issuer name"),
      text(" at "),
      variable("company.name", "Company name"),
      text("."),
    ]),
    block("pageBreak", []),
    block("heading", [text("Acceptance")], { level: 2 }),
    block("paragraph", [text("Please sign below to confirm that you wish to proceed.")]),
    block("signature", [], {}),
  ];
}

async function upsertTemplate(admin, { slug, name, description, type, content }) {
  let template = await DocumentTemplate.findOne({ slug, deletedAt: null });
  if (template) {
    if (template.status !== "published") {
      template.status = "published";
      await template.save();
    }
    return template;
  }
  template = await DocumentTemplate.create({
    name,
    slug,
    description,
    type,
    subjectTypes: ["lead"],
    status: "published",
    createdBy: admin?._id || null,
  });
  const version = await DocumentTemplateVersion.create({
    templateId: template._id,
    version: "1.0",
    status: "published",
    name,
    description,
    content,
    variablesUsed: collectVariablesUsed(content),
    publishedAt: new Date(),
    createdBy: admin?._id || null,
  });
  template.currentPublishedVersionId = version._id;
  await template.save();
  return template;
}

async function seedDocumentTemplates(admin) {
  await upsertTemplate(admin, {
    slug: "supplier-noc",
    name: "Supplier NOC",
    description: "No Objection Certificate for a supplier, with company letterhead and identity merge fields.",
    type: "noc",
    content: nocContent(),
  });
  await upsertTemplate(admin, {
    slug: "supplier-proposal",
    name: "Supplier proposal",
    description: "Commercial proposal for a supplier covering scope, markets, and acceptance.",
    type: "proposal",
    content: proposalContent(),
  });
}

module.exports = { seedDocumentTemplates, nocContent, proposalContent };

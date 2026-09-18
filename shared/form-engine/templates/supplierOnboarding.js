const { createId } = require("../ids");
const { createSection, createField, createOption, createRule, createCondition, createConditionGroup, createDocument, createStage, createValidator, createAction } = require("../models/factories");

function createSupplierOnboardingTemplate() {
  const general = createSection({ id: createId("sec"), title: "Company details", order: 0 });
  const tax = createSection({ id: createId("sec"), title: "Tax & compliance", order: 1 });

  const companyName = createField("text", { key: "company_name", label: "Company Name", sectionId: general.id, required: true });
  const legalName = createField("text", { key: "legal_name", label: "Legal Name", sectionId: general.id });
  const supplierType = createField("dropdown", {
    key: "supplier_type",
    label: "Supplier Type",
    sectionId: general.id,
    required: true,
    options: [createOption("Manufacturer"), createOption("Trader"), createOption("Service")],
  });
  const country = createField("country", { key: "country", label: "Country", sectionId: general.id, required: true });
  const turnover = createField("currency", {
    key: "annual_turnover",
    label: "Annual Turnover",
    sectionId: general.id,
    required: true,
    validators: [
      createValidator("required", { message: "Annual turnover is required" }),
      createValidator("number"),
      createValidator("min", { value: 100000, message: "Annual turnover must be at least ₹1,00,000" }),
      createValidator("max", { value: 1000000000, message: "Annual turnover must be at most ₹1,00,00,00,000" }),
    ],
    metadata: { prefix: "₹", precision: 0 },
  });
  const gstNumber = createField("text", {
    key: "gst_number",
    label: "GST Number",
    sectionId: tax.id,
    visible: false,
    placeholder: "22AAAAA0000A1Z5",
  });
  const gstCertificate = createField("document", {
    key: "gst_certificate",
    label: "GST Certificate",
    sectionId: tax.id,
    visible: false,
  });
  const license = createField("file", {
    key: "manufacturing_license",
    label: "Manufacturing License",
    sectionId: tax.id,
  });

  const gstDoc = createDocument({ key: "gst_certificate", label: "GST Certificate" });
  const taxStage = createStage({ key: "tax_verification", label: "Tax Verification" });
  const complianceStage = createStage({ key: "compliance_review", label: "Compliance Review" });

  const gstRule = createRule({
    name: "GST for Indian manufacturers",
    priority: 100,
    when: createConditionGroup({
      operator: "AND",
      conditions: [
        createCondition({ field: "country", operator: "equals", value: "India" }),
        createCondition({ field: "supplier_type", operator: "equals", value: "manufacturer" }),
        createCondition({ field: "annual_turnover", operator: "greater_than", value: 100000000 }),
      ],
    }),
    then: [
      createAction("show_field", { target: "gst_number" }),
      createAction("make_required", { target: "gst_number" }),
      createAction("show_field", { target: "gst_certificate" }),
      createAction("request_document", { target: "gst_certificate" }),
      createAction("make_document_required", { target: "gst_certificate" }),
      createAction("activate_stage", { target: "tax_verification" }),
      createAction("assign_to", { config: { assignee: "Compliance Team" } }),
      createAction("send_notification", { config: { message: "GST verification required for this supplier" } }),
    ],
  });

  return {
    name: "Supplier Onboarding",
    description: "Collect manufacturer company, tax, and compliance details.",
    version: "1.0",
    status: "draft",
    sections: [general, tax],
    fields: [companyName, legalName, supplierType, country, turnover, gstNumber, gstCertificate, license],
    rules: [gstRule],
    documents: [gstDoc],
    stages: [taxStage, complianceStage],
  };
}

module.exports = { createSupplierOnboardingTemplate };

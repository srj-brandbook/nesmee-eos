const { createId } = require("../ids");
const { createSection, createField, createDocument, createStage } = require("../models/factories");

function createProductComplianceTemplate() {
  const identity = createSection({ id: createId("sec"), title: "Product identity", order: 0 });
  const origin = createSection({ id: createId("sec"), title: "Origin and claims", order: 1 });
  const packing = createSection({ id: createId("sec"), title: "Packing and handling", order: 2 });

  const productName = createField("text", {
    key: "product_name",
    label: "Product name as offered",
    sectionId: identity.id,
    required: true,
  });
  const intendedUse = createField("textarea", {
    key: "intended_use",
    label: "Intended use / buyer application",
    sectionId: identity.id,
    required: true,
  });
  const composition = createField("textarea", {
    key: "composition",
    label: "Composition, materials, or formulation",
    sectionId: identity.id,
    description: "List what the product is made of. Any product type is acceptable.",
  });
  const originCountry = createField("text", {
    key: "origin_country",
    label: "Country of origin",
    sectionId: origin.id,
    required: true,
  });
  const claims = createField("textarea", {
    key: "marketing_claims",
    label: "Claims made to buyers",
    sectionId: origin.id,
    description: "Organic, GI, grade, performance, safety, or other claims that need evidence.",
  });
  const packingMethod = createField("textarea", {
    key: "packing_method",
    label: "Packing and unitization",
    sectionId: packing.id,
  });
  const storage = createField("textarea", {
    key: "storage_conditions",
    label: "Storage and handling conditions",
    sectionId: packing.id,
  });
  const notes = createField("textarea", {
    key: "verification_notes",
    label: "Staff notes",
    sectionId: packing.id,
  });

  const originCert = createDocument({
    key: "origin_certificate",
    label: "Certificate of origin or manufacturer declaration",
    description: "Evidence of origin for the offered product.",
    required: true,
  });
  const specSheet = createDocument({
    key: "specification_sheet",
    label: "Specification or datasheet",
    description: "Technical or commercial specification matching the catalog listing.",
    required: true,
  });
  const qualityCert = createDocument({
    key: "quality_certificate",
    label: "Quality, test, or compliance certificate",
    description: "Any relevant lab report, ISO, CE, FSSAI, or equivalent evidence.",
    required: false,
  });
  const packingList = createDocument({
    key: "packing_evidence",
    label: "Packing photo or packing list sample",
    description: "Optional evidence of how the product is packed for export.",
    required: false,
  });

  const originField = createField("document", {
    key: "origin_certificate",
    label: "Certificate of origin or manufacturer declaration",
    sectionId: origin.id,
  });
  const specField = createField("document", {
    key: "specification_sheet",
    label: "Specification or datasheet",
    sectionId: identity.id,
  });
  const qualityField = createField("document", {
    key: "quality_certificate",
    label: "Quality, test, or compliance certificate",
    sectionId: origin.id,
  });
  const packingField = createField("document", {
    key: "packing_evidence",
    label: "Packing photo or packing list sample",
    sectionId: packing.id,
  });

  const reviewStage = createStage({ key: "product_review", label: "Product review", active: true });

  return {
    name: "Product compliance pack",
    description: "Generic catalog verification for any product type: identity, origin, claims, packing, and supporting documents.",
    version: "1.0",
    status: "draft",
    sections: [identity, origin, packing],
    fields: [productName, intendedUse, composition, specField, originCountry, claims, originField, qualityField, packingMethod, storage, packingField, notes],
    rules: [],
    documents: [specSheet, originCert, qualityCert, packingList],
    stages: [reviewStage],
  };
}

module.exports = { createProductComplianceTemplate };

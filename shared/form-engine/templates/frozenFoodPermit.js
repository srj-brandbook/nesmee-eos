const { createId } = require("../ids");
const { createSection, createField, createOption, createRule, createCondition, createConditionGroup, createDocument, createStage, createValidator, createAction } = require("../models/factories");

function createFrozenFoodPermitTemplate() {
  const facility = createSection({ id: createId("sec"), title: "Facility", order: 0 });
  const operations = createSection({ id: createId("sec"), title: "Processing operations", order: 1 });

  const facilityName = createField("text", {
    key: "facility_name",
    label: "Facility name",
    sectionId: facility.id,
    required: true,
  });
  const facilityAddress = createField("textarea", {
    key: "facility_address",
    label: "Facility address",
    sectionId: facility.id,
    required: true,
  });
  const fssaiNumber = createField("text", {
    key: "fssai_number",
    label: "FSSAI license number",
    sectionId: facility.id,
    required: true,
    placeholder: "10012011000000",
  });
  const processingTypes = createField("dropdown", {
    key: "processing_types",
    label: "Processing types",
    sectionId: operations.id,
    required: true,
    options: [createOption("Frozen"), createOption("Chilled"), createOption("Ambient")],
    metadata: { multiple: true },
  });
  const storageCapacity = createField("number", {
    key: "cold_storage_capacity_mt",
    label: "Cold storage capacity (MT)",
    sectionId: operations.id,
    validators: [createValidator("number"), createValidator("min", { value: 0 })],
    metadata: { suffix: "MT", precision: 0 },
  });
  const notes = createField("textarea", {
    key: "verification_notes",
    label: "Staff notes",
    sectionId: operations.id,
    description: "Optional context for the reviewer.",
  });

  const processingPermit = createDocument({
    key: "frozen_food_processing_permit",
    label: "Frozen food processing permit",
    description: "Valid permit authorizing frozen food processing at this facility.",
    required: true,
  });
  const fssaiLicense = createDocument({
    key: "fssai_license",
    label: "FSSAI license",
    description: "Current FSSAI license matching the facility.",
    required: true,
  });
  const haccp = createDocument({
    key: "haccp_certificate",
    label: "HACCP certificate",
    description: "HACCP or equivalent food safety certification.",
    required: false,
  });
  const coldStorage = createDocument({
    key: "cold_storage_license",
    label: "Cold storage license",
    description: "Required when the facility handles frozen product.",
    required: false,
  });

  const permitField = createField("document", {
    key: "frozen_food_processing_permit",
    label: "Frozen food processing permit",
    sectionId: operations.id,
  });
  const fssaiField = createField("document", {
    key: "fssai_license",
    label: "FSSAI license",
    sectionId: operations.id,
  });
  const haccpField = createField("document", {
    key: "haccp_certificate",
    label: "HACCP certificate",
    sectionId: operations.id,
  });
  const coldStorageField = createField("document", {
    key: "cold_storage_license",
    label: "Cold storage license",
    sectionId: operations.id,
    visible: false,
  });

  const reviewStage = createStage({ key: "permit_review", label: "Permit review", active: true });
  const coldStorageStage = createStage({ key: "cold_storage_check", label: "Cold storage check" });

  const frozenRule = createRule({
    name: "Cold storage license for frozen processing",
    priority: 90,
    when: createConditionGroup({
      operator: "AND",
      conditions: [createCondition({ field: "processing_types", operator: "contains", value: "frozen" })],
    }),
    then: [
      createAction("show_field", { target: "cold_storage_license" }),
      createAction("request_document", { target: "cold_storage_license" }),
      createAction("make_document_required", { target: "cold_storage_license" }),
      createAction("activate_stage", { target: "cold_storage_check" }),
    ],
  });

  return {
    name: "Frozen food processing permit",
    description: "Verify frozen food processing permits, FSSAI, and related facility licenses.",
    version: "1.0",
    status: "draft",
    sections: [facility, operations],
    fields: [facilityName, facilityAddress, fssaiNumber, processingTypes, storageCapacity, notes, permitField, fssaiField, haccpField, coldStorageField],
    rules: [frozenRule],
    documents: [processingPermit, fssaiLicense, haccp, coldStorage],
    stages: [reviewStage, coldStorageStage],
  };
}

module.exports = { createFrozenFoodPermitTemplate };

const FormDefinition = require("../models/FormDefinition");
const FormVersion = require("../models/FormVersion");
const { createSupplierOnboardingTemplate, createFrozenFoodPermitTemplate, createProductComplianceTemplate, validateFormConfiguration } = require("../../../shared/form-engine");

async function seedSampleForm(admin) {
  const existing = await FormDefinition.findOne({ key: "supplier_onboarding", deletedAt: null });
  if (existing) {
    if (!existing.purpose || existing.purpose === "general") {
      existing.purpose = "supplier_onboarding";
      await existing.save();
    }
    return existing;
  }
  const template = createSupplierOnboardingTemplate();
  const form = await FormDefinition.create({
    name: template.name,
    description: template.description,
    key: "supplier_onboarding",
    purpose: "supplier_onboarding",
    status: "draft",
    createdBy: admin?._id || null,
  });
  const version = await FormVersion.create({
    formId: form._id,
    version: "1.0",
    status: "draft",
    name: template.name,
    description: template.description,
    sections: template.sections,
    fields: template.fields,
    rules: template.rules,
    documents: template.documents,
    stages: template.stages,
    createdBy: admin?._id || null,
  });
  form.currentDraftVersionId = version._id;
  await form.save();
  return form;
}

async function seedVerificationForm(admin) {
  const existing = await FormDefinition.findOne({ key: "frozen_food_processing_permit", deletedAt: null });
  if (existing) {
    if (existing.purpose !== "supplier_verification") {
      existing.purpose = "supplier_verification";
      await existing.save();
    }
    return existing;
  }
  const template = createFrozenFoodPermitTemplate();
  const result = validateFormConfiguration(template);
  if (!result.ok) {
    throw new Error(`Frozen food verification template is invalid: ${result.errors.map((item) => item.message).join("; ")}`);
  }
  const form = await FormDefinition.create({
    name: template.name,
    description: template.description,
    key: "frozen_food_processing_permit",
    purpose: "supplier_verification",
    status: "published",
    createdBy: admin?._id || null,
  });
  const version = await FormVersion.create({
    formId: form._id,
    version: "1.0",
    status: "published",
    name: template.name,
    description: template.description,
    sections: template.sections,
    fields: template.fields,
    rules: template.rules,
    documents: template.documents,
    stages: template.stages,
    publishedAt: new Date(),
    createdBy: admin?._id || null,
  });
  form.currentPublishedVersionId = version._id;
  await form.save();
  return form;
}

async function seedProductVerificationForm(admin) {
  const existing = await FormDefinition.findOne({ key: "product_compliance_pack", deletedAt: null });
  if (existing) {
    if (existing.purpose !== "product_verification") {
      existing.purpose = "product_verification";
      await existing.save();
    }
    return existing;
  }
  const template = createProductComplianceTemplate();
  const result = validateFormConfiguration(template);
  if (!result.ok) {
    throw new Error(`Product compliance template is invalid: ${result.errors.map((item) => item.message).join("; ")}`);
  }
  const form = await FormDefinition.create({
    name: template.name,
    description: template.description,
    key: "product_compliance_pack",
    purpose: "product_verification",
    status: "published",
    createdBy: admin?._id || null,
  });
  const version = await FormVersion.create({
    formId: form._id,
    version: "1.0",
    status: "published",
    name: template.name,
    description: template.description,
    sections: template.sections,
    fields: template.fields,
    rules: template.rules,
    documents: template.documents,
    stages: template.stages,
    publishedAt: new Date(),
    createdBy: admin?._id || null,
  });
  form.currentPublishedVersionId = version._id;
  await form.save();
  return form;
}

module.exports = { seedSampleForm, seedVerificationForm, seedProductVerificationForm };

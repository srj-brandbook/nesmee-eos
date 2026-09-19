const FormDefinition = require("../../models/FormDefinition");
const FormVersion = require("../../models/FormVersion");
const FormSubmission = require("../../models/FormSubmission");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializeForm, serializeVersion, serializeSubmission } = require("../../utils/formSerializer");
const auditService = require("../audit/audit.service");
const notificationService = require("../notifications/notification.service");
const {
  emptyDefinition,
  createSupplierOnboardingTemplate,
  createFrozenFoodPermitTemplate,
  createProductComplianceTemplate,
  toFieldKey,
  uniqueKey,
  nextVersionLabel,
  validateFormConfiguration,
  evaluateRule,
  evaluateRules,
} = require("../../../../shared/form-engine");

function notDeleted(extra = {}) {
  return { deletedAt: null, ...extra };
}

function definitionFromVersion(version, form) {
  return {
    name: version.name || form.name,
    description: version.description || form.description,
    version: version.version,
    status: version.status,
    sections: version.sections || [],
    fields: version.fields || [],
    rules: version.rules || [],
    documents: version.documents || [],
    stages: version.stages || [],
  };
}

async function uniqueFormKey(name, excludeId) {
  const base = toFieldKey(name, "form");
  const existing = await FormDefinition.find(notDeleted()).select("key").lean();
  const keys = existing.filter((item) => !excludeId || String(item._id) !== String(excludeId)).map((item) => item.key);
  return uniqueKey(base, keys);
}

async function loadForm(id) {
  const form = await FormDefinition.findOne(notDeleted({ _id: id }));
  if (!form) throw ApiError.notFound("Form not found");
  return form;
}

async function loadDraft(form, { createIfMissing = false, actor = null } = {}) {
  if (form.currentDraftVersionId) {
    const draft = await FormVersion.findById(form.currentDraftVersionId);
    if (draft && draft.status === "draft") return draft;
  }
  if (!createIfMissing) throw ApiError.conflict("No draft version to edit");
  const published = form.currentPublishedVersionId ? await FormVersion.findById(form.currentPublishedVersionId) : null;
  if (!published) throw ApiError.conflict("No published version to clone");
  if (published.status !== "published") throw ApiError.conflict("Current published version is not available");
  const draft = await FormVersion.create({
    formId: form._id,
    version: nextVersionLabel(published.version),
    status: "draft",
    name: published.name,
    description: published.description,
    sections: published.sections,
    fields: published.fields,
    rules: published.rules,
    documents: published.documents,
    stages: published.stages,
    createdBy: actor?._id || null,
  });
  form.currentDraftVersionId = draft._id;
  await form.save();
  return draft;
}

async function hydrate(form) {
  const [draft, published, versions] = await Promise.all([
    form.currentDraftVersionId ? FormVersion.findById(form.currentDraftVersionId).lean() : null,
    form.currentPublishedVersionId ? FormVersion.findById(form.currentPublishedVersionId).lean() : null,
    FormVersion.find({ formId: form._id }).sort({ createdAt: -1 }).lean(),
  ]);
  return serializeForm(form, { draft, published, versions });
}

async function list(query) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "name", "updatedAt", "status"]);
  const filter = notDeleted();
  if (query.status) filter.status = query.status;
  if (query.purpose) filter.purpose = query.purpose;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
      { key: { $regex: query.search, $options: "i" } },
    ];
  }
  const [items, total] = await Promise.all([
    FormDefinition.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    FormDefinition.countDocuments(filter),
  ]);
  const versionIds = items.flatMap((item) => [item.currentDraftVersionId, item.currentPublishedVersionId].filter(Boolean));
  const versions = versionIds.length
    ? await FormVersion.find({ _id: { $in: versionIds } }).select("version status publishedAt updatedAt formId").lean()
    : [];
  const versionMap = Object.fromEntries(versions.map((item) => [String(item._id), item]));
  return {
    items: items.map((item) =>
      serializeForm(item, {
        draft: versionMap[String(item.currentDraftVersionId)] || null,
        published: versionMap[String(item.currentPublishedVersionId)] || null,
      })
    ),
    pagination: paginationMeta({ page, limit, total }),
  };
}

async function create(payload, actor, req) {
  const template =
    payload.template === "supplier_onboarding"
      ? createSupplierOnboardingTemplate()
      : payload.template === "frozen_food_permit"
        ? createFrozenFoodPermitTemplate()
        : payload.template === "product_compliance"
          ? createProductComplianceTemplate()
          : emptyDefinition({ name: payload.name });
  const name = payload.name || template.name;
  const description = payload.description ?? template.description;
  const purpose =
    payload.purpose ||
    (payload.template === "supplier_onboarding"
      ? "supplier_onboarding"
      : payload.template === "frozen_food_permit"
        ? "supplier_verification"
        : payload.template === "product_compliance"
          ? "product_verification"
          : "general");
  const form = await FormDefinition.create({
    name,
    description,
    key: await uniqueFormKey(name),
    status: "draft",
    purpose,
    createdBy: actor._id,
  });
  const version = await FormVersion.create({
    formId: form._id,
    version: "1.0",
    status: "draft",
    name,
    description,
    sections: template.sections,
    fields: template.fields,
    rules: template.rules,
    documents: template.documents,
    stages: template.stages,
    createdBy: actor._id,
  });
  form.currentDraftVersionId = version._id;
  await form.save();
  await auditService.log({
    actor,
    action: "create",
    module: "forms",
    resourceType: "FormDefinition",
    resourceId: form._id,
    req,
    metadata: { name, template: payload.template || "blank" },
  });
  return hydrate(form);
}

async function getById(id) {
  const form = await loadForm(id);
  return hydrate(form);
}

async function update(id, payload, actor, req) {
  const form = await loadForm(id);
  if (payload.name) form.name = payload.name;
  if (payload.description !== undefined) form.description = payload.description;
  if (payload.purpose) form.purpose = payload.purpose;
  await form.save();
  if (form.currentDraftVersionId) {
    await FormVersion.updateOne(
      { _id: form.currentDraftVersionId, status: "draft" },
      { $set: { name: form.name, description: form.description } }
    );
  }
  await auditService.log({
    actor,
    action: "update",
    module: "forms",
    resourceType: "FormDefinition",
    resourceId: form._id,
    req,
  });
  return hydrate(form);
}

async function remove(id, actor, req) {
  const form = await loadForm(id);
  form.deletedAt = new Date();
  await form.save();
  await auditService.log({
    actor,
    action: "delete",
    module: "forms",
    resourceType: "FormDefinition",
    resourceId: form._id,
    req,
  });
}

async function saveDraft(id, payload, actor, req) {
  const form = await loadForm(id);
  const draft = await loadDraft(form, { createIfMissing: Boolean(form.currentPublishedVersionId), actor });
  if (payload.name) {
    form.name = payload.name;
    draft.name = payload.name;
  }
  if (payload.description !== undefined) {
    form.description = payload.description;
    draft.description = payload.description;
  }
  if (payload.sections) draft.sections = payload.sections;
  if (payload.fields) draft.fields = payload.fields;
  if (payload.rules) draft.rules = payload.rules;
  if (payload.documents) draft.documents = payload.documents;
  if (payload.stages) draft.stages = payload.stages;
  await Promise.all([draft.save(), form.save()]);
  await auditService.log({
    actor,
    action: "update",
    module: "forms",
    resourceType: "FormVersion",
    resourceId: draft._id,
    req,
    metadata: { formId: String(form._id), version: draft.version },
  });
  return hydrate(form);
}

async function createDraft(id, actor, req) {
  const form = await loadForm(id);
  const draft = await loadDraft(form, { createIfMissing: true, actor });
  await auditService.log({
    actor,
    action: "create",
    module: "forms",
    resourceType: "FormVersion",
    resourceId: draft._id,
    req,
    metadata: { formId: String(form._id), version: draft.version },
  });
  return hydrate(form);
}

async function publish(id, payload, actor, req) {
  const form = await loadForm(id);
  const draft = await loadDraft(form, { createIfMissing: false });
  const definition = definitionFromVersion(draft, form);
  const result = validateFormConfiguration(definition);
  if (!result.ok) {
    const fields = { configuration: `${result.errorCount} error(s) must be fixed before publishing` };
    result.errors.forEach((item, index) => {
      fields[`error_${index + 1}`] = item.message;
    });
    throw ApiError.validation(fields, "Form configuration is invalid");
  }
  if (!payload?.allowWarnings && result.warningCount) {
    throw ApiError.validation({ configuration: `${result.warningCount} warning(s) present` }, "Form has configuration warnings");
  }

  if (form.currentPublishedVersionId) {
    await FormVersion.updateOne({ _id: form.currentPublishedVersionId, status: "published" }, { $set: { status: "archived" } });
  }
  draft.status = "published";
  draft.publishedAt = new Date();
  await draft.save();
  form.currentPublishedVersionId = draft._id;
  form.currentDraftVersionId = null;
  form.status = "published";
  await form.save();
  await auditService.log({
    actor,
    action: "publish",
    module: "forms",
    resourceType: "FormVersion",
    resourceId: draft._id,
    req,
    metadata: { formId: String(form._id), version: draft.version },
  });
  return { form: await hydrate(form), validation: result };
}

async function validateConfig(id) {
  const form = await loadForm(id);
  const version = form.currentDraftVersionId
    ? await FormVersion.findById(form.currentDraftVersionId)
    : form.currentPublishedVersionId
      ? await FormVersion.findById(form.currentPublishedVersionId)
      : null;
  if (!version) throw ApiError.notFound("Form version not found");
  return validateFormConfiguration(definitionFromVersion(version, form));
}

async function testRule(id, payload) {
  const form = await loadForm(id);
  const version = payload.versionId
    ? await FormVersion.findOne({ _id: payload.versionId, formId: form._id })
    : form.currentDraftVersionId
      ? await FormVersion.findById(form.currentDraftVersionId)
      : await FormVersion.findById(form.currentPublishedVersionId);
  if (!version) throw ApiError.notFound("Form version not found");
  const definition = definitionFromVersion(version, form);
  const rule = (definition.rules || []).find((item) => item.id === payload.ruleId);
  if (!rule) throw ApiError.notFound("Rule not found");
  return evaluateRule(rule, definition, payload.values || {});
}

async function createSubmission(id, payload, actor, req) {
  const form = await loadForm(id);
  const version = payload.versionId
    ? await FormVersion.findOne({ _id: payload.versionId, formId: form._id, status: "published" })
    : form.currentPublishedVersionId
      ? await FormVersion.findById(form.currentPublishedVersionId)
      : null;
  if (!version || version.status !== "published") throw ApiError.conflict("A published version is required to submit");
  const definition = definitionFromVersion(version, form);
  const evaluated = evaluateRules({ definition, values: payload.values || {} });
  if (!evaluated.ok) {
    throw ApiError.validation(evaluated.errors, "Submission is invalid");
  }
  const submission = await FormSubmission.create({
    formId: form._id,
    versionId: version._id,
    values: evaluated.values,
    derivedState: evaluated.derived,
    executedActions: evaluated.executed,
    status: "submitted",
    submittedBy: actor._id,
    submittedAt: new Date(),
  });
  const notifications = (evaluated.derived.communications || []).filter((item) => item.type === "send_notification");
  for (const item of notifications) {
    await notificationService.create({
      userId: actor._id,
      type: "form_rule",
      title: item.subject || "Form notification",
      body: item.message || "",
      data: { formId: String(form._id), submissionId: String(submission._id) },
    });
  }
  await auditService.log({
    actor,
    action: "submit",
    module: "forms",
    resourceType: "FormSubmission",
    resourceId: submission._id,
    req,
    metadata: { formId: String(form._id), versionId: String(version._id) },
  });
  return serializeSubmission(submission);
}

async function listSubmissions(id, query) {
  const form = await loadForm(id);
  const { page, limit, skip } = parsePagination(query);
  const filter = { formId: form._id };
  const [items, total] = await Promise.all([
    FormSubmission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    FormSubmission.countDocuments(filter),
  ]);
  return { items: items.map(serializeSubmission), pagination: paginationMeta({ page, limit, total }) };
}

module.exports = {
  list,
  create,
  getById,
  update,
  remove,
  saveDraft,
  createDraft,
  publish,
  validateConfig,
  testRule,
  createSubmission,
  listSubmissions,
  definitionFromVersion,
  serializeVersion,
};

const FormDefinition = require("../../models/FormDefinition");
const FormVersion = require("../../models/FormVersion");
const FormSubmission = require("../../models/FormSubmission");
const Lead = require("../../models/Lead");
const ExportBuyer = require("../../models/ExportBuyer");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializeSubmission } = require("../../utils/formSerializer");
const auditService = require("../audit/audit.service");
const notificationService = require("../notifications/notification.service");
const { evaluateRules } = require("../../../../shared/form-engine");
const { OPEN_SUBMISSION_STATUSES } = require("../../constants/forms");

const PURPOSE_BY_SUBJECT = {
  lead: "supplier_onboarding",
  buyer: "distributor_onboarding",
};

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

function notDeleted(extra = {}) {
  return { deletedAt: null, ...extra };
}

function actorCan(req, permission) {
  if (req?.isSuperAdmin) return true;
  return (req?.permissions || []).includes(permission);
}

function assertCanView(req, submission) {
  if (actorCan(req, "forms.view") || actorCan(req, "forms.submit")) return;
  if (submission.subjectType === "lead" && actorCan(req, "leads.view")) return;
  if (submission.subjectType === "buyer" && actorCan(req, "export.buyers.view")) return;
  throw ApiError.forbidden();
}

function assertCanFill(req, submission) {
  if (actorCan(req, "forms.submit")) return;
  if (submission.subjectType === "lead" && actorCan(req, "leads.convert")) return;
  if (submission.subjectType === "buyer" && actorCan(req, "export.buyers.update")) return;
  throw ApiError.forbidden();
}

function candidateValues(subject = {}) {
  return {
    company_name: subject.name,
    name: subject.name,
    legal_name: subject.legalName,
    legalName: subject.legalName,
    email: subject.email,
    phone: subject.phone,
    country: subject.country,
    city: subject.city,
    website: subject.website,
    products: subject.products,
    certifications: subject.certifications,
    segment: subject.segment,
  };
}

function prefillFromDefinition(definition, subject) {
  const candidates = candidateValues(subject);
  const values = {};
  (definition.fields || []).forEach((field) => {
    const value = candidates[field.key];
    if (value !== undefined && value !== null && value !== "") values[field.key] = value;
  });
  return values;
}

async function findPublishedByPurpose(purpose) {
  const form = await FormDefinition.findOne(notDeleted({ purpose, status: "published", currentPublishedVersionId: { $ne: null } })).sort({
    updatedAt: -1,
  });
  if (!form) return { form: null, version: null };
  const version = await FormVersion.findById(form.currentPublishedVersionId);
  if (!version || version.status !== "published") return { form: null, version: null };
  return { form, version };
}

async function loadSubject(subjectType, subjectId) {
  if (subjectType === "lead") {
    const lead = await Lead.findOne(notDeleted({ _id: subjectId })).lean();
    if (!lead) throw ApiError.notFound("Lead not found");
    return { subject: lead, name: lead.name, ownerId: lead.ownerId };
  }
  const buyer = await ExportBuyer.findOne(notDeleted({ _id: subjectId })).lean();
  if (!buyer) throw ApiError.notFound("Distributor not found");
  return { subject: buyer, name: buyer.name, ownerId: buyer.ownerId };
}

async function hydrateSubmission(submission) {
  const source = typeof submission.toObject === "function" ? submission.toObject() : submission;
  const [form, version] = await Promise.all([
    source.formId ? FormDefinition.findById(source.formId).select("name key purpose status").lean() : null,
    source.versionId ? FormVersion.findById(source.versionId).lean() : null,
  ]);
  let subject = null;
  if (source.subjectType && source.subjectId) {
    try {
      const loaded = await loadSubject(source.subjectType, source.subjectId);
      subject = { id: String(source.subjectId), type: source.subjectType, name: loaded.name };
    } catch {
      subject = { id: String(source.subjectId), type: source.subjectType, name: null };
    }
  }
  return {
    ...serializeSubmission(source),
    form: form
      ? { id: String(form._id), name: form.name, key: form.key, purpose: form.purpose, status: form.status }
      : null,
    version: version
      ? {
          id: String(version._id),
          version: version.version,
          status: version.status,
          name: version.name,
        }
      : null,
    definition: version
      ? {
          name: version.name || form?.name,
          description: version.description || "",
          sections: version.sections || [],
          fields: version.fields || [],
          rules: version.rules || [],
          documents: version.documents || [],
          stages: version.stages || [],
        }
      : null,
    subject,
  };
}

async function findOpen(subjectType, subjectId, purpose) {
  return FormSubmission.findOne({
    subjectType,
    subjectId,
    purpose,
    status: { $in: OPEN_SUBMISSION_STATUSES },
  }).sort({ updatedAt: -1 });
}

async function latestForSubject(subjectType, subjectId, purpose) {
  return FormSubmission.findOne({ subjectType, subjectId, purpose }).sort({ updatedAt: -1 });
}

async function start({ subjectType, subjectId, actor, req }) {
  const purpose = PURPOSE_BY_SUBJECT[subjectType];
  if (!purpose) throw ApiError.badRequest("Unsupported onboarding subject");
  const { subject } = await loadSubject(subjectType, subjectId);
  const existing = await findOpen(subjectType, subjectId, purpose);
  if (existing) return { onboarding: await hydrateSubmission(existing), created: false, missingForm: false };

  const { form, version } = await findPublishedByPurpose(purpose);
  if (!form || !version) {
    return { onboarding: null, created: false, missingForm: true };
  }

  const definition = definitionFromVersion(version, form);
  const values = prefillFromDefinition(definition, subject);
  const evaluated = evaluateRules({ definition, values });
  const submission = await FormSubmission.create({
    formId: form._id,
    versionId: version._id,
    values: evaluated.values || values,
    derivedState: evaluated.derived || {},
    executedActions: [],
    status: "draft",
    subjectType,
    subjectId,
    purpose,
    submittedBy: actor?._id || null,
    submittedAt: null,
  });
  await auditService.log({
    actor,
    action: "onboarding_start",
    module: "forms",
    resourceType: "FormSubmission",
    resourceId: submission._id,
    req,
    metadata: { subjectType, subjectId: String(subjectId), purpose },
  });
  return { onboarding: await hydrateSubmission(submission), created: true, missingForm: false };
}

async function getById(id, req) {
  const submission = await FormSubmission.findById(id);
  if (!submission) throw ApiError.notFound("Onboarding submission not found");
  if (req) assertCanView(req, submission);
  return hydrateSubmission(submission);
}

async function getForSubject(subjectType, subjectId, req) {
  const purpose = PURPOSE_BY_SUBJECT[subjectType];
  if (!purpose) throw ApiError.badRequest("Unsupported onboarding subject");
  if (req) {
    if (subjectType === "lead" && !actorCan(req, "leads.view") && !actorCan(req, "forms.view")) throw ApiError.forbidden();
    if (subjectType === "buyer" && !actorCan(req, "export.buyers.view") && !actorCan(req, "forms.view")) throw ApiError.forbidden();
  }
  const latest = await latestForSubject(subjectType, subjectId, purpose);
  const { form } = await findPublishedByPurpose(purpose);
  return {
    onboarding: latest ? await hydrateSubmission(latest) : null,
    formConfigured: Boolean(form),
  };
}

async function list(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "updatedAt", "status", "submittedAt"]);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.purpose) filter.purpose = query.purpose;
  else filter.purpose = { $in: ["supplier_onboarding", "distributor_onboarding"] };
  if (query.subjectType) filter.subjectType = query.subjectType;
  if (query.subjectId) filter.subjectId = query.subjectId;
  const [items, total] = await Promise.all([
    FormSubmission.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    FormSubmission.countDocuments(filter),
  ]);
  return {
    items: await Promise.all(items.map((item) => hydrateSubmission(item))),
    pagination: paginationMeta({ page, limit, total }),
  };
}

async function saveDraft(id, payload, actor, req) {
  const submission = await FormSubmission.findById(id);
  if (!submission) throw ApiError.notFound("Onboarding submission not found");
  if (req) assertCanFill(req, submission);
  if (submission.status !== "draft") throw ApiError.conflict("Only draft onboarding can be saved");
  const form = await FormDefinition.findById(submission.formId);
  const version = await FormVersion.findById(submission.versionId);
  if (!form || !version) throw ApiError.notFound("Form version not found");
  const definition = definitionFromVersion(version, form);
  const evaluated = evaluateRules({ definition, values: payload.values || {} });
  submission.values = evaluated.values || payload.values || {};
  submission.derivedState = evaluated.derived || {};
  submission.submittedBy = actor?._id || submission.submittedBy;
  await submission.save();
  await auditService.log({
    actor,
    action: "onboarding_draft",
    module: "forms",
    resourceType: "FormSubmission",
    resourceId: submission._id,
    req,
  });
  return hydrateSubmission(submission);
}

async function submit(id, payload, actor, req) {
  const submission = await FormSubmission.findById(id);
  if (!submission) throw ApiError.notFound("Onboarding submission not found");
  if (req) assertCanFill(req, submission);
  if (submission.status !== "draft") throw ApiError.conflict("Only draft onboarding can be submitted");
  const form = await FormDefinition.findById(submission.formId);
  const version = await FormVersion.findById(submission.versionId);
  if (!form || !version || version.status !== "published") throw ApiError.conflict("A published version is required to submit");
  const definition = definitionFromVersion(version, form);
  const evaluated = evaluateRules({ definition, values: payload.values || submission.values || {} });
  if (!evaluated.ok) throw ApiError.validation(evaluated.errors, "Submission is invalid");
  submission.values = evaluated.values;
  submission.derivedState = evaluated.derived;
  submission.executedActions = evaluated.executed;
  submission.status = "submitted";
  submission.submittedBy = actor?._id || submission.submittedBy;
  submission.submittedAt = new Date();
  await submission.save();

  const { subject, ownerId } = await loadSubject(submission.subjectType, submission.subjectId);
  const notifyUserId = ownerId || actor?._id;
  if (notifyUserId) {
    await notificationService.create({
      userId: notifyUserId,
      type: "onboarding_submitted",
      title: "Onboarding submitted for review",
      body: `${subject.name} is waiting for onboarding review.`,
      data: { submissionId: String(submission._id), subjectType: submission.subjectType, subjectId: String(submission.subjectId) },
    });
  }
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
    action: "onboarding_submit",
    module: "forms",
    resourceType: "FormSubmission",
    resourceId: submission._id,
    req,
    metadata: { subjectType: submission.subjectType, subjectId: String(submission.subjectId) },
  });
  return hydrateSubmission(submission);
}

async function review(id, payload, actor, req) {
  const submission = await FormSubmission.findById(id);
  if (!submission) throw ApiError.notFound("Onboarding submission not found");
  if (submission.status !== "submitted") throw ApiError.conflict("Only submitted onboarding can be reviewed");
  const decision = payload.decision;
  if (!["approved", "rejected"].includes(decision)) throw ApiError.badRequest("Decision must be approved or rejected");

  if (submission.subjectType === "lead" && !actorCan(req, "leads.convert")) throw ApiError.forbidden();
  if (submission.subjectType === "buyer" && !actorCan(req, "export.buyers.update")) throw ApiError.forbidden();

  submission.status = decision;
  submission.reviewedBy = actor._id;
  submission.reviewedAt = new Date();
  submission.reviewNote = payload.note || "";
  await submission.save();

  if (decision === "approved") {
    if (submission.subjectType === "lead") {
      const leadService = require("../leads/lead.service");
      await leadService.convert(submission.subjectId, { stage: "won", statusNote: payload.note || "Onboarding approved" }, actor, req, {
        skipOnboardingCheck: true,
      });
    } else {
      const buyer = await ExportBuyer.findOne(notDeleted({ _id: submission.subjectId }));
      if (buyer) {
        buyer.status = "active";
        buyer.updatedBy = actor._id;
        await buyer.save();
        await auditService.log({
          actor,
          action: "onboarding_approve",
          module: "export-buyers",
          resourceType: "ExportBuyer",
          resourceId: buyer._id,
          req,
          metadata: { submissionId: String(submission._id) },
        });
      }
    }
  } else {
    await auditService.log({
      actor,
      action: "onboarding_reject",
      module: "forms",
      resourceType: "FormSubmission",
      resourceId: submission._id,
      req,
      metadata: { subjectType: submission.subjectType, subjectId: String(submission.subjectId) },
    });
    const { ownerId, subject } = await loadSubject(submission.subjectType, submission.subjectId);
    if (ownerId) {
      await notificationService.create({
        userId: ownerId,
        type: "onboarding_rejected",
        title: "Onboarding returned",
        body: `${subject.name} onboarding was rejected. ${payload.note || "Start a new draft to continue."}`.trim(),
        data: { submissionId: String(submission._id) },
      });
    }
  }

  return hydrateSubmission(submission);
}

module.exports = {
  PURPOSE_BY_SUBJECT,
  findPublishedByPurpose,
  start,
  getById,
  getForSubject,
  list,
  saveDraft,
  submit,
  review,
  findOpen,
  latestForSubject,
  hydrateSubmission,
};

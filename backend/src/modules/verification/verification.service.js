const VerificationCase = require("../../models/VerificationCase");
const VerificationDocument = require("../../models/VerificationDocument");
const FormDefinition = require("../../models/FormDefinition");
const FormVersion = require("../../models/FormVersion");
const Lead = require("../../models/Lead");
const User = require("../../models/User");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializeCase, serializeDocument, serializePerson, serializeLeadRef } = require("../../utils/verificationSerializer");
const { definitionFromVersion } = require("../forms/form.service");
const auditService = require("../audit/audit.service");
const notificationService = require("../notifications/notification.service");
const { evaluateRules } = require("../../../../shared/form-engine");
const {
  ASSIGNABLE_LEAD_STAGES,
  BLOCKING_CASE_STATUSES,
  FILLABLE_CASE_STATUSES,
  REVIEWABLE_CASE_STATUSES,
  EXPIRING_SOON_DAYS,
} = require("../../constants/verification");

function notDeleted(extra = {}) {
  return { deletedAt: null, ...extra };
}

function actorCan(req, permission) {
  if (req?.isSuperAdmin) return true;
  return (req?.permissions || []).includes(permission);
}

function isAssignee(verificationCase, user) {
  return String(verificationCase.assignedToId) === String(user?._id);
}

function assertCanView(req, verificationCase) {
  if (actorCan(req, "verification.view")) return;
  if (isAssignee(verificationCase, req.user) && actorCan(req, "verification.submit")) return;
  throw ApiError.forbidden();
}

function assertCanFill(req, verificationCase) {
  if (!FILLABLE_CASE_STATUSES.includes(verificationCase.status)) {
    throw ApiError.conflict("This verification case can no longer be edited");
  }
  if (req?.isSuperAdmin) return;
  if (isAssignee(verificationCase, req.user) && actorCan(req, "verification.submit")) return;
  throw ApiError.forbidden();
}

function assertCanReview(req) {
  if (actorCan(req, "verification.review")) return;
  throw ApiError.forbidden();
}

function assertCanReviewCase(req, verificationCase) {
  assertCanReview(req);
  if (!REVIEWABLE_CASE_STATUSES.includes(verificationCase.status)) {
    throw ApiError.conflict("Only submitted verifications can be reviewed");
  }
  if (!req?.isSuperAdmin && verificationCase.submittedBy && String(verificationCase.submittedBy) === String(req.user?._id)) {
    throw ApiError.forbidden("The person who submitted this case cannot review it");
  }
}

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasFiles(doc) {
  return (doc.files || []).some((file) => file && (file.url || file.publicId));
}

function documentCatalogMap(version) {
  const map = {};
  for (const item of version.documents || []) {
    if (item?.key) map[item.key] = item;
  }
  return map;
}

function fieldByKey(version, key) {
  return (version.fields || []).find((field) => field.key === key) || {};
}

function catalogDefaults(catalog = {}, derived = {}, field = {}) {
  return {
    label: catalog.label || field.label || catalog.key || field.key || "Document",
    required: Boolean(catalog.required || field.required || derived.required),
    description: catalog.description || field.description || "",
    collectIssuedDate: catalog.collectIssuedDate !== false,
    collectExpiryDate: catalog.collectExpiryDate !== false,
    collectIssuer: catalog.collectIssuer !== false,
    collectDocumentNumber: catalog.collectDocumentNumber !== false,
  };
}

function mapUploadFile(file, actor) {
  if (!file || !(file.url || file.publicId)) return null;
  return {
    url: file.url || "",
    publicId: file.publicId || "",
    name: file.name || "",
    size: Number(file.size) || 0,
    mimeType: file.mimeType || file.type || "",
    type: file.type || file.mimeType || "",
    resourceType: file.resourceType || "",
    format: file.format || "",
    pages: Number(file.pages) || 0,
    uploadedAt: file.uploadedAt ? new Date(file.uploadedAt) : new Date(),
    uploadedBy: actor?._id || file.uploadedBy || null,
  };
}

function evidenceSnapshot(doc) {
  return {
    title: doc.title || "",
    description: doc.description || "",
    issuer: doc.issuer || "",
    documentNumber: doc.documentNumber || "",
    issuedAt: doc.issuedAt || null,
    expiresAt: doc.expiresAt || null,
    files: (doc.files || []).map((file) => ({
      url: file.url || "",
      publicId: file.publicId || "",
      name: file.name || "",
      size: Number(file.size) || 0,
      mimeType: file.mimeType || file.type || "",
      type: file.type || file.mimeType || "",
      resourceType: file.resourceType || "",
      format: file.format || "",
      pages: Number(file.pages) || 0,
      uploadedAt: file.uploadedAt || null,
    })),
  };
}

function filesSignature(files = []) {
  return (files || []).map((file) => file?.publicId || file?.url || "").join("|");
}

function uploadedFilesOf(fieldValue) {
  if (!fieldValue || typeof fieldValue !== "object") return undefined;
  const list = Array.isArray(fieldValue.files)
    ? fieldValue.files
    : Array.isArray(fieldValue)
      ? fieldValue
      : fieldValue.url || fieldValue.publicId
        ? [fieldValue]
        : null;
  if (!list) return undefined;
  const uploaded = list.filter((file) => file && (file.url || file.publicId));
  return uploaded.length ? uploaded : undefined;
}

function applyEvidence(doc, evidence = {}, actor) {
  if (evidence.title !== undefined) doc.title = evidence.title || "";
  if (evidence.description !== undefined) doc.description = evidence.description || "";
  if (evidence.issuer !== undefined) doc.issuer = evidence.issuer || "";
  if (evidence.documentNumber !== undefined) doc.documentNumber = evidence.documentNumber || "";
  if (evidence.issuedAt !== undefined) doc.issuedAt = parseDate(evidence.issuedAt);
  if (evidence.expiresAt !== undefined) {
    const nextExpiry = parseDate(evidence.expiresAt);
    if (String(nextExpiry || "") !== String(doc.expiresAt || "")) {
      doc.expiryNotices = { d30At: null, d7At: null, d0At: null };
    }
    doc.expiresAt = nextExpiry;
  }
  if (evidence.files) {
    doc.files = evidence.files.map((file) => mapUploadFile(file, actor)).filter(Boolean);
    if (["verified", "rejected", "expired", "submitted"].includes(doc.status) && hasFiles(doc) && doc.status !== "verified") {
      doc.status = "pending_upload";
      doc.verifiedBy = null;
      doc.verifiedAt = null;
    }
    if (doc.status === "pending_upload" || doc.status === "rejected" || doc.status === "expired") {
      if (hasFiles(doc) && ["rejected", "expired"].includes(doc.status)) {
        doc.status = "pending_upload";
        doc.rejectionReason = doc.status === "rejected" ? doc.rejectionReason : "";
      }
    }
  }
}

async function loadCase(id) {
  const item = await VerificationCase.findOne(notDeleted({ _id: id }));
  if (!item) throw ApiError.notFound("Verification case not found");
  return item;
}

async function loadActiveUser(id) {
  if (!id) return null;
  const user = await User.findOne(notDeleted({ _id: id, status: "active" })).select("name email avatarUrl status").lean();
  if (!user) throw ApiError.badRequest("Assignee not found or inactive");
  return user;
}

async function loadAssignableLead(leadId) {
  const lead = await Lead.findOne(notDeleted({ _id: leadId }));
  if (!lead) throw ApiError.notFound("Lead not found");
  if (!ASSIGNABLE_LEAD_STAGES.includes(lead.stage)) {
    throw ApiError.badRequest("Convert the manufacturer before assigning verification");
  }
  return lead;
}

async function loadPublishedVerificationForm(formId) {
  const form = await FormDefinition.findOne(notDeleted({ _id: formId }));
  if (!form) throw ApiError.notFound("Form not found");
  if (form.purpose !== "supplier_verification") {
    throw ApiError.badRequest("Only published supplier verification forms can be assigned");
  }
  if (!form.currentPublishedVersionId) throw ApiError.conflict("Publish the verification form before assigning it");
  const version = await FormVersion.findById(form.currentPublishedVersionId);
  if (!version || version.status !== "published") throw ApiError.conflict("Publish the verification form before assigning it");
  return { form, version };
}

function definitionOf(version, form) {
  return definitionFromVersion(version, form);
}

function questionnaireDefinition(definition) {
  return {
    ...definition,
    fields: (definition.fields || []).map((field) =>
      field.type === "file" || field.type === "document" ? { ...field, required: false, validators: [] } : field
    ),
  };
}

function requestedDocumentKeys(version, derived) {
  const keys = new Set();
  for (const item of version.documents || []) {
    if (item?.key) keys.add(item.key);
  }
  for (const field of version.fields || []) {
    if ((field.type === "document" || field.type === "file") && field.key) keys.add(field.key);
  }
  for (const [key, state] of Object.entries(derived?.documents || {})) {
    if (state?.requested || state?.required) keys.add(key);
  }
  return [...keys];
}

async function upsertDocuments(verificationCase, version, derived, values = {}, actor = null) {
  const catalog = documentCatalogMap(version);
  const keys = requestedDocumentKeys(version, derived);
  const existing = await VerificationDocument.find(notDeleted({ caseId: verificationCase._id }));
  const byKey = Object.fromEntries(existing.map((item) => [item.documentKey, item]));

  for (const key of keys) {
    const defaults = catalogDefaults(catalog[key] || { key, label: key }, derived?.documents?.[key] || {}, fieldByKey(version, key));
    let doc = byKey[key];
    if (!doc) {
      doc = await VerificationDocument.create({
        caseId: verificationCase._id,
        leadId: verificationCase.leadId,
        documentKey: key,
        label: defaults.label,
        description: defaults.description,
        required: defaults.required,
        collectIssuedDate: defaults.collectIssuedDate,
        collectExpiryDate: defaults.collectExpiryDate,
        collectIssuer: defaults.collectIssuer,
        collectDocumentNumber: defaults.collectDocumentNumber,
        title: defaults.label,
      });
    } else {
      let dirty = false;
      if ((defaults.label || doc.label) !== doc.label) {
        doc.label = defaults.label || doc.label;
        dirty = true;
      }
      if (doc.required !== defaults.required) {
        doc.required = defaults.required;
        dirty = true;
      }
      if (doc.collectIssuedDate !== defaults.collectIssuedDate) {
        doc.collectIssuedDate = defaults.collectIssuedDate;
        dirty = true;
      }
      if (doc.collectExpiryDate !== defaults.collectExpiryDate) {
        doc.collectExpiryDate = defaults.collectExpiryDate;
        dirty = true;
      }
      if (doc.collectIssuer !== defaults.collectIssuer) {
        doc.collectIssuer = defaults.collectIssuer;
        dirty = true;
      }
      if (doc.collectDocumentNumber !== defaults.collectDocumentNumber) {
        doc.collectDocumentNumber = defaults.collectDocumentNumber;
        dirty = true;
      }
      const fieldValue = values[key];
      if (fieldValue && typeof fieldValue === "object") {
        applyEvidence(
          doc,
          {
            title: fieldValue.title,
            description: fieldValue.description,
            issuer: fieldValue.issuer,
            documentNumber: fieldValue.documentNumber,
            issuedAt: fieldValue.issuedAt || fieldValue.issuedDate,
            expiresAt: fieldValue.expiresAt || fieldValue.expiryDate,
            files: uploadedFilesOf(fieldValue),
          },
          actor
        );
        dirty = true;
      }
      if (dirty) await doc.save();
      continue;
    }

    const fieldValue = values[key];
    if (fieldValue && typeof fieldValue === "object") {
      applyEvidence(
        doc,
        {
          title: fieldValue.title,
          description: fieldValue.description,
          issuer: fieldValue.issuer,
          documentNumber: fieldValue.documentNumber,
          issuedAt: fieldValue.issuedAt || fieldValue.issuedDate,
          expiresAt: fieldValue.expiresAt || fieldValue.expiryDate,
          files: uploadedFilesOf(fieldValue),
        },
        actor
      );
    }
    await doc.save();
  }
  return VerificationDocument.find(notDeleted({ caseId: verificationCase._id })).sort({ createdAt: 1 });
}

function documentCounts(documents = []) {
  const counts = { required: 0, verified: 0, pending: 0, submitted: 0, rejected: 0, expired: 0, expiringSoon: 0 };
  const soon = addDays(startOfDay(), EXPIRING_SOON_DAYS);
  const now = startOfDay();
  for (const doc of documents) {
    if (!doc.required) continue;
    counts.required += 1;
    if (doc.status === "verified") counts.verified += 1;
    if (doc.status === "expired") counts.expired += 1;
    if (doc.status === "rejected") counts.rejected += 1;
    if (["pending_upload", "submitted", "rejected"].includes(doc.status)) counts.pending += 1;
    if (doc.status === "submitted") counts.submitted += 1;
    if (doc.status === "verified" && doc.expiresAt) {
      const expires = startOfDay(doc.expiresAt);
      if (expires >= now && expires <= soon) counts.expiringSoon += 1;
    }
  }
  return counts;
}

function deriveCaseStatus(currentStatus, documents = []) {
  if (currentStatus === "cancelled") return "cancelled";
  const required = documents.filter((item) => item.required);
  if (required.some((item) => item.status === "expired")) return "expired";
  return currentStatus;
}

async function refreshCaseStatus(verificationCase, documents) {
  const next = deriveCaseStatus(verificationCase.status, documents);
  if (next !== verificationCase.status) {
    verificationCase.status = next;
    if (next === "verified") verificationCase.reviewedAt = new Date();
    await verificationCase.save();
  }
  return verificationCase;
}

async function recomputeLeadRollup(leadId) {
  const cases = await VerificationCase.find(notDeleted({ leadId, status: { $ne: "cancelled" } })).lean();
  const documents = await VerificationDocument.find(notDeleted({ leadId })).lean();
  const docsByCase = {};
  for (const doc of documents) {
    const key = String(doc.caseId);
    if (!docsByCase[key]) docsByCase[key] = [];
    docsByCase[key].push(doc);
  }

  const summary = { required: 0, verified: 0, pending: 0, expired: 0, expiringSoon: 0 };
  let status = "none";
  const rank = { expired: 4, rejected: 3, pending: 2, verified: 1, none: 0 };

  for (const item of cases) {
    const counts = documentCounts(docsByCase[String(item._id)] || []);
    summary.required += counts.required;
    summary.verified += counts.verified;
    summary.pending += counts.pending;
    summary.expired += counts.expired;
    summary.expiringSoon += counts.expiringSoon;

    let caseStatus = "pending";
    if (item.status === "expired" || counts.expired) caseStatus = "expired";
    else if (item.status === "rejected" || counts.rejected) caseStatus = "rejected";
    else if (item.status === "verified") caseStatus = "verified";
    else caseStatus = "pending";
    if (rank[caseStatus] > rank[status]) status = caseStatus;
  }

  if (!cases.length) status = "none";

  await Lead.updateOne(
    { _id: leadId },
    {
      $set: {
        verificationStatus: status,
        verificationSummary: summary,
      },
    }
  );
  return { verificationStatus: status, verificationSummary: summary };
}

async function notifyUsers(userIds, payload) {
  const unique = [...new Set(userIds.filter(Boolean).map((id) => String(id)))];
  for (const userId of unique) {
    await notificationService.create({ ...payload, userId });
  }
}

async function hydrate(verificationCase, extras = {}) {
  const [form, version, lead, assignedTo, createdBy, submitter, reviewer, documents] = await Promise.all([
    extras.form || (verificationCase.formId ? FormDefinition.findById(verificationCase.formId).select("name key purpose status").lean() : null),
    extras.version || (verificationCase.versionId ? FormVersion.findById(verificationCase.versionId).lean() : null),
    extras.lead || Lead.findById(verificationCase.leadId).select("name legalName stage email verificationStatus verificationSummary").lean(),
    extras.assignedTo || User.findById(verificationCase.assignedToId).select("name email avatarUrl").lean(),
    extras.createdBy || (verificationCase.createdBy ? User.findById(verificationCase.createdBy).select("name email avatarUrl").lean() : null),
    extras.submitter || (verificationCase.submittedBy ? User.findById(verificationCase.submittedBy).select("name email avatarUrl").lean() : null),
    extras.reviewer || (verificationCase.reviewedBy ? User.findById(verificationCase.reviewedBy).select("name email avatarUrl").lean() : null),
    extras.documents ||
      VerificationDocument.find(notDeleted({ caseId: verificationCase._id }))
        .populate("reviews.actorId", "name email avatarUrl")
        .populate("verifiedBy", "name email avatarUrl")
        .sort({ createdAt: 1 }),
  ]);
  const definition = version && form ? questionnaireDefinition(definitionOf(version, form)) : extras.definition || null;
  const reviewActorIds = [...new Set((verificationCase.reviews || []).map((item) => item.actorId).filter(Boolean).map((id) => String(id)))];
  const reviewActors = extras.reviewActors || (reviewActorIds.length
    ? await User.find({ _id: { $in: reviewActorIds } }).select("name email avatarUrl").lean()
    : []);
  const actorsById = Object.fromEntries(reviewActors.map((user) => [String(user._id), user]));
  const caseSource = typeof verificationCase.toObject === "function" ? verificationCase.toObject() : { ...verificationCase };
  caseSource.reviews = (caseSource.reviews || []).map((item) => ({
    ...item,
    actorId: actorsById[String(item.actorId)] || item.actorId,
  }));
  return serializeCase(caseSource, {
    lead: serializeLeadRef(lead),
    form: form ? { id: String(form._id), name: form.name, purpose: form.purpose } : null,
    assignedTo: serializePerson(assignedTo),
    createdBy: serializePerson(createdBy),
    submitter: serializePerson(submitter),
    reviewer: serializePerson(reviewer),
    documents: documents.map(serializeDocument),
    definition,
    documentCounts: documentCounts(documents),
  });
}

async function listTemplates() {
  const forms = await FormDefinition.find(
    notDeleted({ purpose: "supplier_verification", status: "published", currentPublishedVersionId: { $ne: null } })
  )
    .sort({ name: 1 })
    .lean();
  const versionIds = forms.map((item) => item.currentPublishedVersionId).filter(Boolean);
  const versions = versionIds.length ? await FormVersion.find({ _id: { $in: versionIds } }).lean() : [];
  const versionMap = Object.fromEntries(versions.map((item) => [String(item._id), item]));
  return forms.map((form) => {
    const version = versionMap[String(form.currentPublishedVersionId)];
    return {
      id: String(form._id),
      name: form.name,
      description: form.description || "",
      key: form.key,
      purpose: form.purpose,
      versionId: version ? String(version._id) : null,
      version: version?.version || null,
      documents: (version?.documents || []).map((item) => ({
        key: item.key,
        label: item.label,
        required: Boolean(item.required),
        description: item.description || "",
      })),
    };
  });
}

async function assignees() {
  const users = await User.find(notDeleted({ status: "active" })).select("name email avatarUrl").sort({ name: 1 }).lean();
  return users.map((user) => ({ id: String(user._id), name: user.name, email: user.email, avatarUrl: user.avatarUrl || "" }));
}

async function list(query, req) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "updatedAt", "dueAt", "status", "title"]);
  const filter = notDeleted();
  if (query.status) filter.status = query.status;
  if (query.leadId) filter.leadId = query.leadId;
  if (query.formId) filter.formId = query.formId;
  if (query.assignedTo === "me" || (!query.assignedTo && !actorCan(req, "verification.view"))) {
    filter.assignedToId = req.user._id;
  } else if (query.assignedTo && query.assignedTo !== "all" && query.assignedTo !== "me") {
    filter.assignedToId = query.assignedTo;
  }
  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
    ];
  }
  if (query.expiring === "true") {
    const soon = addDays(startOfDay(), EXPIRING_SOON_DAYS);
    const expiringDocs = await VerificationDocument.find(
      notDeleted({
        required: true,
        expiresAt: { $ne: null, $lte: soon },
        status: { $in: ["verified", "submitted", "expired"] },
      })
    )
      .select("caseId")
      .lean();
    const ids = [...new Set(expiringDocs.map((item) => String(item.caseId)))];
    filter._id = { $in: ids };
    filter.status = filter.status || { $ne: "cancelled" };
  }

  const [items, total] = await Promise.all([
    VerificationCase.find(filter)
      .populate("leadId", "name legalName stage email")
      .populate("assignedToId", "name email avatarUrl")
      .populate("submittedBy", "name email avatarUrl")
      .populate("formId", "name purpose")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    VerificationCase.countDocuments(filter),
  ]);
  const caseIds = items.map((item) => item._id);
  const documents = caseIds.length
    ? await VerificationDocument.find(notDeleted({ caseId: { $in: caseIds } }))
        .select("caseId required status expiresAt")
        .lean()
    : [];
  const grouped = {};
  for (const doc of documents) {
    const key = String(doc.caseId);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(doc);
  }

  return {
    items: items.map((item) =>
      serializeCase(item, {
        lead: serializeLeadRef(item.leadId),
        assignedTo: serializePerson(item.assignedToId),
        submitter: serializePerson(item.submittedBy),
        form: item.formId ? { id: String(item.formId._id), name: item.formId.name, purpose: item.formId.purpose } : null,
        documentCounts: documentCounts(grouped[String(item._id)] || []),
      })
    ),
    pagination: paginationMeta({ page, limit, total }),
  };
}

async function create(payload, actor, req) {
  const lead = await loadAssignableLead(payload.leadId);
  const { form, version } = await loadPublishedVerificationForm(payload.formId);
  const assignedToId = payload.assignedToId || actor._id;
  await loadActiveUser(assignedToId);

  const blocking = await VerificationCase.findOne(
    notDeleted({ leadId: lead._id, formId: form._id, status: { $in: BLOCKING_CASE_STATUSES } })
  );
  if (blocking) {
    throw ApiError.conflict("This supplier already has an open verification for that form");
  }

  const definition = definitionOf(version, form);
  const evaluated = evaluateRules({ definition, values: {} });
  const item = await VerificationCase.create({
    leadId: lead._id,
    formId: form._id,
    versionId: version._id,
    title: payload.title || form.name,
    description: payload.description ?? form.description ?? "",
    assignedToId,
    createdBy: actor._id,
    dueAt: parseDate(payload.dueAt),
    status: "assigned",
    values: evaluated.values,
    derivedState: evaluated.derived,
    leadNote: payload.note || "",
  });
  await upsertDocuments(item, version, evaluated.derived, evaluated.values, actor);
  await recomputeLeadRollup(lead._id);

  const recipients = [assignedToId, lead.ownerId].filter((id) => String(id) !== String(actor._id));
  await notifyUsers(recipients, {
    type: "verification_assigned",
    title: `Verification assigned: ${item.title}`,
    body: `${lead.name} needs ${item.title}.`,
    data: { caseId: String(item._id), leadId: String(lead._id) },
  });
  await auditService.log({
    actor,
    action: "assign",
    module: "verification",
    resourceType: "VerificationCase",
    resourceId: item._id,
    req,
    metadata: { leadId: String(lead._id), formId: String(form._id), assignedToId: String(assignedToId) },
  });
  return hydrate(item, { form, version, lead });
}

async function getById(id, req) {
  const item = await loadCase(id);
  assertCanView(req, item);
  const [form, version] = await Promise.all([
    item.formId ? FormDefinition.findById(item.formId).lean() : null,
    item.versionId ? FormVersion.findById(item.versionId).lean() : null,
  ]);
  if (form && version) {
    const definition = questionnaireDefinition(definitionOf(version, form));
    const evaluated = evaluateRules({ definition, values: item.values || {} });
    const needed = requestedDocumentKeys(version, evaluated.derived || item.derivedState);
    const existing = await VerificationDocument.find(notDeleted({ caseId: item._id })).select("documentKey").lean();
    const have = new Set(existing.map((doc) => doc.documentKey));
    if (needed.some((key) => !have.has(key))) {
      await upsertDocuments(item, version, evaluated.derived || item.derivedState, item.values || {});
    }
  }
  return hydrate(item, { form, version });
}

async function saveDraft(id, payload, actor, req) {
  const item = await loadCase(id);
  assertCanFill(req, item);
  const [form, version] = await Promise.all([
    FormDefinition.findById(item.formId).lean(),
    FormVersion.findById(item.versionId).lean(),
  ]);
  if (!form || !version) throw ApiError.notFound("Verification form version not found");
  const definition = questionnaireDefinition(definitionOf(version, form));
  const evaluated = evaluateRules({ definition, values: payload.values || item.values || {} });
  item.values = evaluated.values;
  item.derivedState = evaluated.derived;
  if (item.status === "assigned") {
    item.status = "in_progress";
    item.reviews = item.reviews || [];
    item.reviews.push({ action: "started", note: "", actorId: actor._id, createdAt: new Date() });
  }
  await item.save();
  await upsertDocuments(item, version, evaluated.derived, evaluated.values, actor);
  await recomputeLeadRollup(item.leadId);
  return hydrate(item, { form, version });
}

function validateDocumentsForSubmit(documents) {
  const fields = {};
  const now = startOfDay();
  for (const doc of documents) {
    if (!doc.required) continue;
    if (!hasFiles(doc)) {
      fields[doc.documentKey] = `${doc.label || doc.documentKey} must be uploaded`;
      continue;
    }
    if (doc.collectIssuedDate && !doc.issuedAt) {
      fields[`${doc.documentKey}_issuedAt`] = `Issued date is required for ${doc.label || doc.documentKey}`;
    }
    if (doc.collectExpiryDate && !doc.expiresAt) {
      fields[`${doc.documentKey}_expiresAt`] = `Expiry date is required for ${doc.label || doc.documentKey}`;
    }
    if (doc.issuedAt && doc.expiresAt && doc.expiresAt < doc.issuedAt) {
      fields[`${doc.documentKey}_expiresAt`] = `Expiry date must be on or after the issued date for ${doc.label || doc.documentKey}`;
    }
    if (doc.expiresAt && startOfDay(doc.expiresAt) < now) {
      fields[`${doc.documentKey}_expiresAt`] = `${doc.label || doc.documentKey} has already expired`;
    }
  }
  return fields;
}

async function submit(id, payload, actor, req) {
  const item = await loadCase(id);
  assertCanFill(req, item);
  const form = await FormDefinition.findById(item.formId);
  const version = await FormVersion.findById(item.versionId);
  if (!form || !version) throw ApiError.notFound("Verification form version not found");
  const definition = questionnaireDefinition(definitionOf(version, form));
  const evaluated = evaluateRules({ definition, values: payload.values || item.values || {} });
  if (!evaluated.ok) {
    throw ApiError.validation(evaluated.errors, "Complete the verification form before submitting");
  }
  item.values = evaluated.values;
  item.derivedState = evaluated.derived;
  const documents = await upsertDocuments(item, version, evaluated.derived, evaluated.values, actor);
  const documentErrors = validateDocumentsForSubmit(documents);
  if (Object.keys(documentErrors).length) {
    throw ApiError.validation(documentErrors, "Required documents are incomplete");
  }
  for (const doc of documents) {
    if (hasFiles(doc) && ["pending_upload", "rejected", "expired"].includes(doc.status)) {
      doc.status = "submitted";
      await doc.save();
    }
  }
  const refreshed = await VerificationDocument.find(notDeleted({ caseId: item._id })).sort({ createdAt: 1 });
  item.status = "submitted";
  item.submittedAt = new Date();
  item.submittedBy = actor._id;
  item.reviewNote = "";
  item.reviews = item.reviews || [];
  item.reviews.push({ action: "submitted", note: "", actorId: actor._id, createdAt: item.submittedAt });
  await item.save();
  await refreshCaseStatus(item, refreshed);
  await recomputeLeadRollup(item.leadId);

  const lead = await Lead.findById(item.leadId).select("name ownerId").lean();
  await notifyUsers([item.createdBy, lead?.ownerId].filter((id) => String(id) !== String(actor._id)), {
    type: "verification_submitted",
    title: `Verification submitted: ${item.title}`,
    body: `${lead?.name || "Supplier"} submitted ${item.title} for review.`,
    data: { caseId: String(item._id), leadId: String(item.leadId) },
  });
  await auditService.log({
    actor,
    action: "submit",
    module: "verification",
    resourceType: "VerificationCase",
    resourceId: item._id,
    req,
    metadata: { leadId: String(item.leadId) },
  });
  return hydrate(item, { form, version, documents: refreshed, lead });
}

async function reassign(id, payload, actor, req) {
  const item = await loadCase(id);
  if (item.status === "cancelled") throw ApiError.conflict("Cannot reassign a cancelled case");
  await loadActiveUser(payload.assignedToId);
  const previous = item.assignedToId;
  item.assignedToId = payload.assignedToId;
  if (payload.dueAt !== undefined) item.dueAt = parseDate(payload.dueAt);
  if (payload.note) item.leadNote = payload.note;
  await item.save();
  if (String(previous) !== String(payload.assignedToId)) {
    const lead = await Lead.findById(item.leadId).select("name").lean();
    await notifyUsers([payload.assignedToId], {
      type: "verification_assigned",
      title: `Verification assigned: ${item.title}`,
      body: `${lead?.name || "Supplier"} needs ${item.title}.`,
      data: { caseId: String(item._id), leadId: String(item.leadId) },
    });
  }
  await auditService.log({
    actor,
    action: "assign",
    module: "verification",
    resourceType: "VerificationCase",
    resourceId: item._id,
    req,
    metadata: { assignedToId: String(payload.assignedToId) },
  });
  return hydrate(item);
}

async function cancel(id, payload, actor, req) {
  const item = await loadCase(id);
  if (item.status === "cancelled") return hydrate(item);
  item.status = "cancelled";
  if (payload?.note) item.reviewNote = payload.note;
  await item.save();
  await recomputeLeadRollup(item.leadId);
  await auditService.log({
    actor,
    action: "cancel",
    module: "verification",
    resourceType: "VerificationCase",
    resourceId: item._id,
    req,
  });
  return hydrate(item);
}

async function updateDocument(id, payload, actor, req) {
  const doc = await VerificationDocument.findOne(notDeleted({ _id: id }));
  if (!doc) throw ApiError.notFound("Document not found");
  const item = await loadCase(doc.caseId);
  assertCanFill(req, item);
  if (doc.status === "verified") {
    throw ApiError.conflict("Verified documents cannot be replaced until they expire or are rejected");
  }
  const previous = evidenceSnapshot(doc);
  const hadFiles = hasFiles(doc);
  applyEvidence(doc, payload, actor);
  if (payload.files) {
    const changed = filesSignature(previous.files) !== filesSignature(doc.files);
    if (changed && hadFiles) {
      doc.reviews.push({ action: "replaced", note: "Previous file kept for the verification log", actorId: actor._id, createdAt: new Date(), snapshot: previous });
    } else if (changed && hasFiles(doc)) {
      doc.reviews.push({ action: "uploaded", note: "", actorId: actor._id, createdAt: new Date(), snapshot: evidenceSnapshot(doc) });
    }
  }
  if (hasFiles(doc) && item.status === "assigned") {
    item.status = "in_progress";
    await item.save();
  }
  await doc.save();
  await recomputeLeadRollup(item.leadId);
  return { document: serializeDocument(doc), case: await hydrate(item) };
}

async function reviewDocument(id, payload, actor, req) {
  const doc = await VerificationDocument.findOne(notDeleted({ _id: id }));
  if (!doc) throw ApiError.notFound("Document not found");
  const item = await loadCase(doc.caseId);
  assertCanReviewCase(req, item);
  if (!hasFiles(doc)) throw ApiError.badRequest("Upload a file before reviewing this document");
  if (doc.status === "expired") throw ApiError.conflict("This document has expired and must be replaced");

  const decision = payload.decision;
  const note = payload.note || "";
  if (decision === "rejected" && !note.trim()) {
    throw ApiError.validation({ note: "A note is required when rejecting a document" }, "Rejection note required");
  }

  if (decision === "verified") {
    doc.status = "verified";
    doc.verifiedBy = actor._id;
    doc.verifiedAt = new Date();
    doc.rejectionReason = "";
  } else {
    doc.status = "rejected";
    doc.verifiedBy = null;
    doc.verifiedAt = null;
    doc.rejectionReason = note;
  }
  doc.reviews.push({
    action: decision,
    note,
    actorId: actor._id,
    createdAt: new Date(),
    snapshot: evidenceSnapshot(doc),
  });
  await doc.save();

  await auditService.log({
    actor,
    action: decision === "verified" ? "verify" : "reject",
    module: "verification",
    resourceType: "VerificationDocument",
    resourceId: doc._id,
    req,
    metadata: { caseId: String(item._id), decision },
  });
  return { document: serializeDocument(doc), case: await hydrate(item) };
}

function requiredDocumentsReady(documents = []) {
  const required = documents.filter((item) => item.required);
  if (!required.length) return true;
  return required.every((item) => item.status === "verified");
}

async function reviewCase(id, payload, actor, req) {
  const item = await loadCase(id);
  assertCanReviewCase(req, item);
  const decision = payload.decision;
  const note = (payload.note || "").trim();
  if (decision === "rejected" && !note) {
    throw ApiError.validation({ note: "A note is required when returning a verification" }, "Review note required");
  }

  const documents = await VerificationDocument.find(notDeleted({ caseId: item._id })).sort({ createdAt: 1 });
  if (decision === "verified" && !requiredDocumentsReady(documents)) {
    throw ApiError.conflict("Verify every required document before approving this case");
  }
  if (decision === "verified" && documents.some((doc) => doc.required && doc.status === "rejected")) {
    throw ApiError.conflict("Returned documents must be resolved before approving this case");
  }

  item.status = decision === "verified" ? "verified" : "rejected";
  item.reviewedAt = new Date();
  item.reviewedBy = actor._id;
  item.reviewNote = note;
  item.reviews = item.reviews || [];
  item.reviews.push({ action: decision, note, actorId: actor._id, createdAt: new Date() });
  await item.save();
  await recomputeLeadRollup(item.leadId);

  const lead = await Lead.findById(item.leadId).select("name ownerId").lean();
  const recipients = [item.assignedToId, item.createdBy, lead?.ownerId].filter((id) => String(id) !== String(actor._id));
  if (decision === "verified") {
    await notifyUsers(recipients, {
      type: "verification_verified",
      title: `Verification approved: ${item.title}`,
      body: `${lead?.name || "Supplier"} — ${item.title} is verified.`,
      data: { caseId: String(item._id), leadId: String(item.leadId) },
    });
  } else {
    await notifyUsers(recipients, {
      type: "verification_rejected",
      title: `Verification returned: ${item.title}`,
      body: `${lead?.name || "Supplier"} — ${note}`,
      data: { caseId: String(item._id), leadId: String(item.leadId) },
    });
  }
  await auditService.log({
    actor,
    action: decision === "verified" ? "verify" : "reject",
    module: "verification",
    resourceType: "VerificationCase",
    resourceId: item._id,
    req,
    metadata: { decision },
  });
  return hydrate(item, { documents, lead });
}

async function summaryForLead(leadId, req) {
  const lead = await Lead.findOne(notDeleted({ _id: leadId })).lean();
  if (!lead) throw ApiError.notFound("Lead not found");
  if (!actorCan(req, "verification.view") && !actorCan(req, "leads.view")) throw ApiError.forbidden();
  const cases = await VerificationCase.find(notDeleted({ leadId }))
    .populate("assignedToId", "name email avatarUrl")
    .populate("formId", "name purpose")
    .sort({ createdAt: -1 })
    .lean();
  const documents = await VerificationDocument.find(notDeleted({ leadId })).sort({ createdAt: 1 });
  const grouped = {};
  for (const doc of documents) {
    const key = String(doc.caseId);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(doc);
  }
  return {
    lead: serializeLeadRef(lead),
    status: lead.verificationStatus || "none",
    summary: lead.verificationSummary || { required: 0, verified: 0, pending: 0, expired: 0, expiringSoon: 0 },
    cases: cases.map((item) =>
      serializeCase(item, {
        assignedTo: serializePerson(item.assignedToId),
        form: item.formId ? { id: String(item.formId._id), name: item.formId.name, purpose: item.formId.purpose } : null,
        documentCounts: documentCounts(grouped[String(item._id)] || []),
      })
    ),
    documents: documents.map(serializeDocument),
  };
}

module.exports = {
  listTemplates,
  assignees,
  list,
  create,
  getById,
  saveDraft,
  submit,
  reassign,
  cancel,
  updateDocument,
  reviewDocument,
  reviewCase,
  summaryForLead,
  recomputeLeadRollup,
  startOfDay,
  addDays,
  documentCounts,
};

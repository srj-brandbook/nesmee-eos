function idOf(value) {
  if (!value) return null;
  return String(value._id || value.id || value);
}

function serializeVersion(version) {
  if (!version) return null;
  const source = typeof version.toObject === "function" ? version.toObject() : version;
  return {
    id: String(source._id),
    formId: idOf(source.formId),
    version: source.version,
    status: source.status,
    name: source.name || "",
    description: source.description || "",
    sections: source.sections || [],
    fields: source.fields || [],
    rules: source.rules || [],
    documents: source.documents || [],
    stages: source.stages || [],
    publishedAt: source.publishedAt,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeVersionSummary(version) {
  if (!version) return null;
  const source = typeof version.toObject === "function" ? version.toObject() : version;
  return {
    id: String(source._id),
    version: source.version,
    status: source.status,
    publishedAt: source.publishedAt,
    updatedAt: source.updatedAt,
  };
}

function serializeForm(form, { draft = null, published = null, versions = null } = {}) {
  const source = typeof form.toObject === "function" ? form.toObject() : form;
  const payload = {
    id: String(source._id),
    name: source.name,
    description: source.description || "",
    key: source.key,
    status: source.status,
    purpose: source.purpose || "general",
    currentDraftVersionId: idOf(source.currentDraftVersionId),
    currentPublishedVersionId: idOf(source.currentPublishedVersionId),
    draft: draft ? serializeVersion(draft) : null,
    published: published ? serializeVersion(published) : serializeVersionSummary(source.currentPublishedVersionId),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
  if (versions) payload.versions = versions.map(serializeVersionSummary);
  return payload;
}

function serializeSubmission(submission) {
  const source = typeof submission.toObject === "function" ? submission.toObject() : submission;
  return {
    id: String(source._id),
    formId: idOf(source.formId),
    versionId: idOf(source.versionId),
    values: source.values || {},
    derivedState: source.derivedState || {},
    executedActions: source.executedActions || [],
    status: source.status,
    subjectType: source.subjectType || null,
    subjectId: source.subjectId ? String(source.subjectId) : null,
    purpose: source.purpose || null,
    submittedBy: idOf(source.submittedBy),
    submittedAt: source.submittedAt,
    reviewedBy: idOf(source.reviewedBy),
    reviewedAt: source.reviewedAt || null,
    reviewNote: source.reviewNote || "",
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

module.exports = { serializeForm, serializeVersion, serializeVersionSummary, serializeSubmission };

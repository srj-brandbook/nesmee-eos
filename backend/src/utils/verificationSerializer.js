function idOf(value) {
  if (!value) return null;
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (typeof value.toHexString === "function") return value.toHexString();
    return String(value);
  }
  return String(value);
}

function serializePerson(value) {
  if (!value || typeof value !== "object" || !(value.name || value.email)) return null;
  return {
    id: String(value._id || value.id),
    name: value.name || "",
    email: value.email || "",
    avatarUrl: value.avatarUrl || "",
  };
}

function serializeFile(file = {}) {
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
    uploadedAt: file.uploadedAt || null,
    uploadedBy: idOf(file.uploadedBy),
  };
}

function serializeReview(review = {}) {
  const snapshot = review.snapshot || null;
  return {
    action: review.action,
    note: review.note || "",
    actorId: idOf(review.actorId),
    actor: serializePerson(review.actorId),
    createdAt: review.createdAt,
    snapshot: snapshot
      ? {
          title: snapshot.title || "",
          description: snapshot.description || "",
          issuer: snapshot.issuer || "",
          documentNumber: snapshot.documentNumber || "",
          issuedAt: snapshot.issuedAt || null,
          expiresAt: snapshot.expiresAt || null,
          files: (snapshot.files || []).map(serializeFile),
        }
      : null,
  };
}

function serializeDocument(doc) {
  const source = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(source._id),
    caseId: idOf(source.caseId),
    leadId: idOf(source.leadId),
    documentKey: source.documentKey,
    label: source.label || source.title || source.documentKey,
    title: source.title || "",
    description: source.description || "",
    issuer: source.issuer || "",
    documentNumber: source.documentNumber || "",
    issuedAt: source.issuedAt || null,
    expiresAt: source.expiresAt || null,
    files: (source.files || []).map(serializeFile),
    status: source.status,
    required: Boolean(source.required),
    collectIssuedDate: source.collectIssuedDate !== false,
    collectExpiryDate: source.collectExpiryDate !== false,
    collectIssuer: source.collectIssuer !== false,
    collectDocumentNumber: source.collectDocumentNumber !== false,
    verifiedBy: idOf(source.verifiedBy),
    verifier: serializePerson(source.verifiedBy),
    verifiedAt: source.verifiedAt || null,
    rejectionReason: source.rejectionReason || "",
    reviews: (source.reviews || []).map(serializeReview),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeCase(item, extras = {}) {
  const source = typeof item.toObject === "function" ? item.toObject() : item;
  return {
    id: String(source._id),
    leadId: idOf(source.leadId),
    lead: extras.lead || serializePerson(source.leadId) || (source.leadId?.name ? { id: idOf(source.leadId), name: source.leadId.name, stage: source.leadId.stage } : null),
    formId: idOf(source.formId),
    form: extras.form || (source.formId?.name ? { id: idOf(source.formId), name: source.formId.name, purpose: source.formId.purpose } : null),
    versionId: idOf(source.versionId),
    title: source.title,
    description: source.description || "",
    assignedToId: idOf(source.assignedToId),
    assignedTo: extras.assignedTo || serializePerson(source.assignedToId),
    createdBy: extras.createdBy || serializePerson(source.createdBy),
    dueAt: source.dueAt || null,
    status: source.status,
    values: source.values || {},
    derivedState: source.derivedState || {},
    submittedAt: source.submittedAt || null,
    submittedBy: idOf(source.submittedBy),
    submitter: extras.submitter || serializePerson(source.submittedBy),
    reviewedAt: source.reviewedAt || null,
    reviewedBy: idOf(source.reviewedBy),
    reviewer: extras.reviewer || serializePerson(source.reviewedBy),
    leadNote: source.leadNote || "",
    reviewNote: source.reviewNote || "",
    reviews: (source.reviews || []).map(serializeReview),
    documents: extras.documents,
    definition: extras.definition,
    documentCounts: extras.documentCounts,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeLeadRef(lead) {
  if (!lead) return null;
  const source = typeof lead.toObject === "function" ? lead.toObject() : lead;
  return {
    id: String(source._id || source.id),
    name: source.name,
    legalName: source.legalName || "",
    stage: source.stage,
    email: source.email || "",
    verificationStatus: source.verificationStatus || "none",
    verificationSummary: source.verificationSummary || {},
  };
}

module.exports = {
  idOf,
  serializePerson,
  serializeFile,
  serializeDocument,
  serializeCase,
  serializeLeadRef,
};

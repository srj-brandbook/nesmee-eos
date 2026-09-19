function idOf(value) {
  if (!value) return null;
  return String(value._id || value.id || value);
}

function serializeFile(file) {
  if (!file) return null;
  const source = typeof file.toObject === "function" ? file.toObject() : file;
  if (!source.url && !source.publicId && !source.name) return null;
  return {
    id: source._id ? String(source._id) : null,
    url: source.url || "",
    publicId: source.publicId || "",
    name: source.name || "",
    size: source.size || 0,
    mimeType: source.mimeType || source.type || "",
    type: source.type || source.mimeType || "",
    resourceType: source.resourceType || "",
    format: source.format || "",
    pages: source.pages || 0,
    kind: source.kind || "upload",
    uploadedAt: source.uploadedAt || null,
    uploadedBy: idOf(source.uploadedBy),
  };
}

function serializeVersion(version, { includeContent = true } = {}) {
  if (!version) return null;
  const source = typeof version.toObject === "function" ? version.toObject() : version;
  const payload = {
    id: String(source._id),
    templateId: idOf(source.templateId),
    version: source.version,
    status: source.status,
    name: source.name || "",
    description: source.description || "",
    variablesUsed: source.variablesUsed || [],
    publishedAt: source.publishedAt,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
  if (includeContent) payload.content = source.content || [];
  return payload;
}

function serializeTemplate(template, { draft = null, published = null, versions = null, includeContent = true } = {}) {
  const source = typeof template.toObject === "function" ? template.toObject() : template;
  const payload = {
    id: String(source._id),
    name: source.name,
    slug: source.slug,
    description: source.description || "",
    type: source.type,
    subjectTypes: source.subjectTypes || ["lead"],
    status: source.status,
    coverUrl: source.coverUrl || "",
    icon: source.icon || "",
    letterhead: source.letterhead || {},
    currentDraftVersionId: idOf(source.currentDraftVersionId),
    currentPublishedVersionId: idOf(source.currentPublishedVersionId),
    draft: draft ? serializeVersion(draft, { includeContent }) : null,
    published: published ? serializeVersion(published, { includeContent }) : null,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
  if (versions) payload.versions = versions.map((item) => serializeVersion(item, { includeContent: false }));
  return payload;
}

function serializeDocument(doc) {
  const source = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(source._id),
    templateId: idOf(source.templateId),
    templateVersionId: idOf(source.templateVersionId),
    subjectType: source.subjectType || "none",
    subjectId: source.subjectId ? String(source.subjectId) : null,
    subjectName: source.subjectName || "",
    title: source.title,
    type: source.type,
    docNumber: source.docNumber || "",
    status: source.status,
    content: source.content || [],
    coverUrl: source.coverUrl || "",
    icon: source.icon || "",
    bindings: source.bindings || {},
    missingVariables: source.missingVariables || [],
    variablesUsed: source.variablesUsed || [],
    letterhead: source.letterhead || {},
    issuedAt: source.issuedAt,
    issuedBy: idOf(source.issuedBy),
    filedAt: source.filedAt,
    voidedAt: source.voidedAt,
    voidReason: source.voidReason || "",
    pdf: serializeFile(source.pdf),
    packet: serializeFile(source.packet),
    attachments: (source.attachments || []).map(serializeFile).filter(Boolean),
    attachmentOrder: source.attachmentOrder || [],
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

module.exports = { serializeTemplate, serializeVersion, serializeDocument, serializeFile, idOf };

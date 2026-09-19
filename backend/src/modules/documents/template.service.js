const DocumentTemplate = require("../../models/DocumentTemplate");
const DocumentTemplateVersion = require("../../models/DocumentTemplateVersion");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializeTemplate } = require("../../utils/documentSerializer");
const auditService = require("../audit/audit.service");
const { collectVariablesUsed } = require("./document.bindings");
const {
  emptyBlockNoteContent,
  nextVersionLabel,
  slugify,
  DOCUMENT_TYPES,
} = require("../../constants/documents");

function notDeleted(extra = {}) {
  return { deletedAt: null, ...extra };
}

async function uniqueSlug(name, excludeId) {
  const base = slugify(name);
  const existing = await DocumentTemplate.find(notDeleted()).select("slug").lean();
  const slugs = existing
    .filter((item) => !excludeId || String(item._id) !== String(excludeId))
    .map((item) => item.slug);
  if (!slugs.includes(base)) return base;
  let index = 2;
  while (slugs.includes(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

async function loadTemplate(id) {
  const template = await DocumentTemplate.findOne(notDeleted({ _id: id }));
  if (!template) throw ApiError.notFound("Template not found");
  return template;
}

async function loadDraft(template, { createIfMissing = false, actor = null } = {}) {
  if (template.currentDraftVersionId) {
    const draft = await DocumentTemplateVersion.findById(template.currentDraftVersionId);
    if (draft && draft.status === "draft") return draft;
  }
  if (!createIfMissing) throw ApiError.conflict("No draft version to edit");
  const published = template.currentPublishedVersionId
    ? await DocumentTemplateVersion.findById(template.currentPublishedVersionId)
    : null;
  if (!published) throw ApiError.conflict("No published version to clone");
  const draft = await DocumentTemplateVersion.create({
    templateId: template._id,
    version: nextVersionLabel(published.version),
    status: "draft",
    name: published.name,
    description: published.description,
    content: published.content,
    variablesUsed: published.variablesUsed,
    createdBy: actor?._id || null,
  });
  template.currentDraftVersionId = draft._id;
  await template.save();
  return draft;
}

async function hydrate(template, { includeContent = true } = {}) {
  const [draft, published, versions] = await Promise.all([
    template.currentDraftVersionId ? DocumentTemplateVersion.findById(template.currentDraftVersionId).lean() : null,
    template.currentPublishedVersionId ? DocumentTemplateVersion.findById(template.currentPublishedVersionId).lean() : null,
    DocumentTemplateVersion.find({ templateId: template._id }).sort({ createdAt: -1 }).lean(),
  ]);
  return serializeTemplate(template, { draft, published, versions, includeContent });
}

async function list(query) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "name", "updatedAt", "status", "type"]);
  const filter = notDeleted();
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;
  if (query.subjectType) filter.subjectTypes = query.subjectType;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
      { slug: { $regex: query.search, $options: "i" } },
    ];
  }
  const [items, total] = await Promise.all([
    DocumentTemplate.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    DocumentTemplate.countDocuments(filter),
  ]);
  const versionIds = items.flatMap((item) => [item.currentDraftVersionId, item.currentPublishedVersionId].filter(Boolean));
  const versions = versionIds.length
    ? await DocumentTemplateVersion.find({ _id: { $in: versionIds } })
        .select("version status publishedAt updatedAt templateId")
        .lean()
    : [];
  const versionMap = Object.fromEntries(versions.map((item) => [String(item._id), item]));
  return {
    items: items.map((item) =>
      serializeTemplate(item, {
        draft: versionMap[String(item.currentDraftVersionId)] || null,
        published: versionMap[String(item.currentPublishedVersionId)] || null,
        includeContent: false,
      })
    ),
    pagination: paginationMeta({ page, limit, total }),
  };
}

async function create(payload, actor, req) {
  const name = payload.name;
  const template = await DocumentTemplate.create({
    name,
    slug: await uniqueSlug(name),
    description: payload.description || "",
    type: DOCUMENT_TYPES.includes(payload.type) ? payload.type : "custom",
    subjectTypes: payload.subjectTypes?.length ? payload.subjectTypes : ["lead"],
    status: "draft",
    coverUrl: payload.coverUrl || "",
    icon: payload.icon || "",
    letterhead: payload.letterhead || {},
    createdBy: actor._id,
  });
  const version = await DocumentTemplateVersion.create({
    templateId: template._id,
    version: "1.0",
    status: "draft",
    name,
    description: payload.description || "",
    content: payload.content?.length ? payload.content : emptyBlockNoteContent(),
    variablesUsed: collectVariablesUsed(payload.content || []),
    createdBy: actor._id,
  });
  template.currentDraftVersionId = version._id;
  await template.save();
  await auditService.log({
    actor,
    action: "create",
    module: "documents",
    resourceType: "DocumentTemplate",
    resourceId: template._id,
    req,
    metadata: { name },
  });
  return hydrate(template);
}

async function getById(id) {
  const template = await loadTemplate(id);
  return hydrate(template);
}

async function update(id, payload, actor, req) {
  const template = await loadTemplate(id);
  if (payload.name) {
    template.name = payload.name;
    if (!payload.slug) template.slug = await uniqueSlug(payload.name, template._id);
  }
  if (payload.description != null) template.description = payload.description;
  if (payload.type) template.type = payload.type;
  if (payload.subjectTypes) template.subjectTypes = payload.subjectTypes;
  if (payload.coverUrl != null) template.coverUrl = payload.coverUrl;
  if (payload.icon != null) template.icon = payload.icon;
  if (payload.letterhead) template.letterhead = { ...(template.letterhead || {}), ...payload.letterhead };
  await template.save();
  await auditService.log({
    actor,
    action: "update",
    module: "documents",
    resourceType: "DocumentTemplate",
    resourceId: template._id,
    req,
    metadata: payload,
  });
  return hydrate(template);
}

async function remove(id, actor, req) {
  const template = await loadTemplate(id);
  template.deletedAt = new Date();
  await template.save();
  await auditService.log({
    actor,
    action: "delete",
    module: "documents",
    resourceType: "DocumentTemplate",
    resourceId: template._id,
    req,
  });
}

async function saveDraft(id, payload, actor, req) {
  const template = await loadTemplate(id);
  const draft = await loadDraft(template, { createIfMissing: true, actor });
  if (payload.name != null) draft.name = payload.name;
  if (payload.description != null) draft.description = payload.description;
  if (payload.content) {
    draft.content = payload.content;
    draft.variablesUsed = collectVariablesUsed(payload.content);
  }
  await draft.save();
  if (payload.name) template.name = payload.name;
  if (payload.description != null) template.description = payload.description;
  await template.save();
  await auditService.log({
    actor,
    action: "update",
    module: "documents",
    resourceType: "DocumentTemplateVersion",
    resourceId: draft._id,
    req,
    metadata: { templateId: String(template._id), version: draft.version },
  });
  return hydrate(template);
}

async function createDraft(id, actor, req) {
  const template = await loadTemplate(id);
  await loadDraft(template, { createIfMissing: true, actor });
  await auditService.log({
    actor,
    action: "create",
    module: "documents",
    resourceType: "DocumentTemplateVersion",
    resourceId: template.currentDraftVersionId,
    req,
  });
  return hydrate(template);
}

async function publish(id, actor, req) {
  const template = await loadTemplate(id);
  const draft = await loadDraft(template, { createIfMissing: false });
  draft.status = "published";
  draft.publishedAt = new Date();
  draft.variablesUsed = collectVariablesUsed(draft.content);
  await draft.save();
  if (template.currentPublishedVersionId && String(template.currentPublishedVersionId) !== String(draft._id)) {
    await DocumentTemplateVersion.updateOne(
      { _id: template.currentPublishedVersionId, status: "published" },
      { $set: { status: "archived" } }
    );
  }
  template.currentPublishedVersionId = draft._id;
  template.currentDraftVersionId = null;
  template.status = "published";
  await template.save();
  await auditService.log({
    actor,
    action: "publish",
    module: "documents",
    resourceType: "DocumentTemplate",
    resourceId: template._id,
    req,
    metadata: { version: draft.version },
  });
  return hydrate(template);
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
  loadTemplate,
};

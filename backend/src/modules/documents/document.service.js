const mongoose = require("mongoose");
const Document = require("../../models/Document");
const DocumentTemplate = require("../../models/DocumentTemplate");
const DocumentTemplateVersion = require("../../models/DocumentTemplateVersion");
const Lead = require("../../models/Lead");
const ExportBuyer = require("../../models/ExportBuyer");
const Settings = require("../../models/Settings");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializeDocument } = require("../../utils/documentSerializer");
const auditService = require("../audit/audit.service");
const { catalogForSubject, EDITABLE_DOCUMENT_STATUSES, TYPE_LABELS } = require("../../constants/documents");
const {
  buildContext,
  collectVariablesUsed,
  applyBindings,
  rebindChips,
  bindingRows,
  companyFromSettings,
} = require("./document.bindings");
const { nextDocNumber } = require("./document.numbering");
const { documentToHtml } = require("./document.html");
const { htmlToPdf, storePdf, mergePdfs, fileToPdfBytes } = require("./document.pdf");

function notDeleted(extra = {}) {
  return { deletedAt: null, ...extra };
}

async function loadDocument(id) {
  const doc = await Document.findOne(notDeleted({ _id: id }));
  if (!doc) throw ApiError.notFound("Document not found");
  return doc;
}

async function getSettings() {
  return Settings.findOneAndUpdate({ key: "app" }, { $setOnInsert: { key: "app" } }, { upsert: true, new: true }).lean();
}

async function loadSubject(subjectType, subjectId) {
  if (!subjectType || subjectType === "none") return { subject: null, name: "" };
  if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
    throw ApiError.badRequest("A valid subject is required for this template");
  }
  if (subjectType === "lead") {
    const lead = await Lead.findOne(notDeleted({ _id: subjectId })).lean();
    if (!lead) throw ApiError.notFound("Supplier not found");
    return { subject: lead, name: lead.legalName || lead.name || "" };
  }
  if (subjectType === "buyer") {
    const buyer = await ExportBuyer.findOne(notDeleted({ _id: subjectId })).lean();
    if (!buyer) throw ApiError.notFound("Buyer not found");
    return { subject: buyer, name: buyer.legalName || buyer.name || "" };
  }
  throw ApiError.badRequest("Unsupported subject type");
}

async function resolveContext({ subjectType, subjectId, actor, docMeta }) {
  const settings = await getSettings();
  const { subject, name } = await loadSubject(subjectType, subjectId);
  const context = buildContext({ subjectType, subject, settings, actor, docMeta });
  return { settings, subject, subjectName: name, context };
}

function variables(subjectType) {
  return { items: catalogForSubject(subjectType || "none") };
}

async function previewBindings(payload, actor) {
  const template = payload.templateId ? await DocumentTemplate.findOne(notDeleted({ _id: payload.templateId })).lean() : null;
  const type = payload.type || template?.type || "custom";
  const title = payload.title || template?.name || TYPE_LABELS[type] || "Document";
  const { context, subjectName } = await resolveContext({
    subjectType: payload.subjectType || template?.subjectTypes?.[0] || "none",
    subjectId: payload.subjectId,
    actor,
    docMeta: { title, type, number: payload.docNumber || "" },
  });
  let content = [];
  if (template?.currentPublishedVersionId) {
    const version = await DocumentTemplateVersion.findById(template.currentPublishedVersionId).lean();
    content = version?.content || [];
  }
  const applied = applyBindings(content, context.values);
  return {
    subjectName,
    bindings: context,
    rows: bindingRows(context.values, payload.subjectType || "lead"),
    missingVariables: applied.missingVariables,
    variablesUsed: collectVariablesUsed(content),
  };
}

async function list(query) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "updatedAt", "title", "status", "type", "docNumber"]);
  const filter = notDeleted();
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;
  if (query.subjectType) filter.subjectType = query.subjectType;
  if (query.subjectId) filter.subjectId = query.subjectId;
  if (query.templateId) filter.templateId = query.templateId;
  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { docNumber: { $regex: query.search, $options: "i" } },
      { subjectName: { $regex: query.search, $options: "i" } },
    ];
  }
  const [items, total] = await Promise.all([
    Document.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Document.countDocuments(filter),
  ]);
  return {
    items: items.map((item) => {
      const serialized = serializeDocument(item);
      delete serialized.content;
      return serialized;
    }),
    pagination: paginationMeta({ page, limit, total }),
  };
}

async function generate(payload, actor, req) {
  const template = await DocumentTemplate.findOne(notDeleted({ _id: payload.templateId, status: "published" }));
  if (!template) throw ApiError.notFound("Published template not found");
  if (!template.currentPublishedVersionId) throw ApiError.conflict("Template has no published version");
  const version = await DocumentTemplateVersion.findById(template.currentPublishedVersionId);
  if (!version) throw ApiError.notFound("Template version not found");

  const subjectType = payload.subjectType || template.subjectTypes?.[0] || "none";
  if (template.subjectTypes?.length && !template.subjectTypes.includes(subjectType) && !template.subjectTypes.includes("none")) {
    throw ApiError.badRequest("This template cannot be used for that subject");
  }
  const docNumber = await nextDocNumber(template.type);
  const title = payload.title || `${template.name}`;
  const { context, subjectName, settings } = await resolveContext({
    subjectType,
    subjectId: payload.subjectId,
    actor,
    docMeta: { title, type: template.type, number: docNumber },
  });
  const applied = applyBindings(version.content, context.values);
  const doc = await Document.create({
    templateId: template._id,
    templateVersionId: version._id,
    subjectType,
    subjectId: payload.subjectId || null,
    subjectName,
    title,
    type: template.type,
    docNumber,
    status: "draft",
    content: applied.content,
    coverUrl: template.coverUrl,
    icon: template.icon,
    bindings: context.values,
    missingVariables: applied.missingVariables,
    variablesUsed: collectVariablesUsed(applied.content),
    letterhead: {
      ...(companyFromSettings(settings)),
      ...(template.letterhead || {}),
    },
    createdBy: actor._id,
    updatedBy: actor._id,
  });
  await auditService.log({
    actor,
    action: "create",
    module: "documents",
    resourceType: "Document",
    resourceId: doc._id,
    req,
    metadata: { templateId: String(template._id), docNumber },
  });
  return serializeDocument(doc);
}

async function getById(id) {
  const doc = await loadDocument(id);
  return serializeDocument(doc);
}

function assertEditable(doc) {
  if (!EDITABLE_DOCUMENT_STATUSES.includes(doc.status)) {
    throw ApiError.conflict("Issued documents cannot be edited. Void it or create a new one.");
  }
}

async function update(id, payload, actor, req) {
  const doc = await loadDocument(id);
  assertEditable(doc);
  if (payload.title != null) doc.title = payload.title;
  if (payload.coverUrl != null) doc.coverUrl = payload.coverUrl;
  if (payload.icon != null) doc.icon = payload.icon;
  if (payload.status && ["draft", "in_review"].includes(payload.status)) doc.status = payload.status;
  if (payload.content) {
    doc.content = payload.content;
    doc.variablesUsed = collectVariablesUsed(payload.content);
    const applied = rebindChips(payload.content, doc.bindings || {});
    doc.missingVariables = applied.missingVariables;
  }
  doc.updatedBy = actor._id;
  await doc.save();
  await auditService.log({
    actor,
    action: "update",
    module: "documents",
    resourceType: "Document",
    resourceId: doc._id,
    req,
  });
  return serializeDocument(doc);
}

async function rebind(id, actor, req) {
  const doc = await loadDocument(id);
  assertEditable(doc);
  const { context, subjectName } = await resolveContext({
    subjectType: doc.subjectType,
    subjectId: doc.subjectId,
    actor,
    docMeta: { title: doc.title, type: doc.type, number: doc.docNumber, issuedAt: doc.issuedAt },
  });
  const applied = rebindChips(doc.content, context.values);
  doc.content = applied.content;
  doc.bindings = context.values;
  doc.missingVariables = applied.missingVariables;
  doc.subjectName = subjectName || doc.subjectName;
  doc.updatedBy = actor._id;
  await doc.save();
  await auditService.log({
    actor,
    action: "update",
    module: "documents",
    resourceType: "Document",
    resourceId: doc._id,
    req,
    metadata: { rebind: true },
  });
  return serializeDocument(doc);
}

async function remove(id, actor, req) {
  const doc = await loadDocument(id);
  if (doc.status === "issued" || doc.status === "filed") {
    throw ApiError.conflict("Void the document instead of deleting an issued file");
  }
  doc.deletedAt = new Date();
  await doc.save();
  await auditService.log({
    actor,
    action: "delete",
    module: "documents",
    resourceType: "Document",
    resourceId: doc._id,
    req,
  });
}

function printPayload(doc, settings) {
  const company = { ...companyFromSettings(settings), ...(doc.letterhead || {}) };
  const html = documentToHtml({
    title: doc.title,
    docNumber: doc.docNumber,
    content: doc.content,
    letterhead: doc.letterhead,
    company,
  });
  return { document: serializeDocument(doc), settings: companyFromSettings(settings), company, html };
}

async function print(id) {
  const doc = await loadDocument(id);
  const settings = await getSettings();
  return printPayload(doc, settings);
}

async function buildIssuedPdf(doc) {
  const settings = await getSettings();
  const payload = printPayload(doc, settings);
  return htmlToPdf(payload.html, doc.title, {
    title: doc.title,
    docNumber: doc.docNumber,
    content: doc.content,
    letterhead: doc.letterhead,
    company: payload.company,
  });
}

async function buildPacketPdf(doc) {
  const issuedBytes = await buildIssuedPdf(doc);
  const orderedIds = doc.attachmentOrder?.length ? doc.attachmentOrder : (doc.attachments || []).map((item) => String(item._id));
  const attachmentMap = Object.fromEntries((doc.attachments || []).map((item) => [String(item._id), item]));
  const attachments = [];
  orderedIds.forEach((fileId) => {
    if (attachmentMap[fileId]) attachments.push(attachmentMap[fileId]);
  });
  (doc.attachments || []).forEach((item) => {
    if (!orderedIds.includes(String(item._id))) attachments.push(item);
  });
  const parts = [issuedBytes];
  for (const file of attachments) {
    try {
      parts.push(await fileToPdfBytes(file));
    } catch {
      // Skip attachments Cloudinary will not release.
    }
  }
  return parts.length === 1 ? issuedBytes : mergePdfs(parts);
}

async function downloadFile(id, kind = "pdf") {
  const doc = await loadDocument(id);
  const target = kind === "packet" ? doc.packet : doc.pdf;
  const filename = target?.name || `${doc.docNumber || "document"}${kind === "packet" ? "-packet" : ""}.pdf`;
  if (kind === "packet") {
    if (!["issued", "filed"].includes(doc.status) && !doc.pdf) {
      throw ApiError.conflict("Issue the document before downloading a filing packet");
    }
    return { buffer: await buildPacketPdf(doc), filename };
  }
  if (!["issued", "filed"].includes(doc.status) && !doc.pdf) {
    throw ApiError.conflict("Issue the document before downloading a PDF");
  }
  return { buffer: await buildIssuedPdf(doc), filename };
}

async function issue(id, actor, req) {
  const doc = await loadDocument(id);
  if (!EDITABLE_DOCUMENT_STATUSES.includes(doc.status) && doc.status !== "issued") {
    throw ApiError.conflict("This document cannot be issued");
  }
  doc.issuedAt = new Date();
  doc.issuedBy = actor._id;
  const { context } = await resolveContext({
    subjectType: doc.subjectType,
    subjectId: doc.subjectId,
    actor,
    docMeta: { title: doc.title, type: doc.type, number: doc.docNumber, issuedAt: doc.issuedAt },
  });
  const applied = rebindChips(doc.content, context.values);
  doc.content = applied.content;
  doc.bindings = context.values;
  doc.missingVariables = applied.missingVariables;
  const buffer = await buildIssuedPdf(doc);
  const stored = await storePdf(buffer, `${doc.docNumber || "document"}.pdf`);
  stored.kind = "generated";
  stored.uploadedBy = actor._id;
  stored.uploadedAt = new Date();
  doc.pdf = stored;
  doc.status = "issued";
  doc.updatedBy = actor._id;
  await doc.save();
  await auditService.log({
    actor,
    action: "issue",
    module: "documents",
    resourceType: "Document",
    resourceId: doc._id,
    req,
    metadata: { docNumber: doc.docNumber },
  });
  return serializeDocument(doc);
}

async function voidDocument(id, payload, actor, req) {
  const doc = await loadDocument(id);
  if (doc.status === "void") throw ApiError.conflict("Document is already void");
  doc.status = "void";
  doc.voidedAt = new Date();
  doc.voidReason = payload.reason || "";
  doc.updatedBy = actor._id;
  await doc.save();
  await auditService.log({
    actor,
    action: "void",
    module: "documents",
    resourceType: "Document",
    resourceId: doc._id,
    req,
    metadata: { reason: doc.voidReason },
  });
  return serializeDocument(doc);
}

function fileFromPayload(item, actor) {
  return {
    url: item.url || "",
    publicId: item.publicId || "",
    name: item.name || "",
    size: item.size || 0,
    mimeType: item.mimeType || item.type || "",
    type: item.type || item.mimeType || "",
    resourceType: item.resourceType || "",
    format: item.format || "",
    pages: item.pages || 0,
    kind: item.kind || "upload",
    uploadedAt: item.uploadedAt || new Date(),
    uploadedBy: actor?._id || null,
  };
}

async function saveAttachments(id, payload, actor, req) {
  const doc = await loadDocument(id);
  if (payload.attachments) {
    doc.attachments = payload.attachments.map((item) => fileFromPayload(item, actor));
  }
  if (payload.attachmentOrder) doc.attachmentOrder = payload.attachmentOrder;
  doc.updatedBy = actor._id;
  await doc.save();
  await auditService.log({
    actor,
    action: "update",
    module: "documents",
    resourceType: "Document",
    resourceId: doc._id,
    req,
    metadata: { attachments: doc.attachments.length },
  });
  return serializeDocument(doc);
}

async function createPacket(id, actor, req) {
  const doc = await loadDocument(id);
  if (!["issued", "filed"].includes(doc.status)) {
    throw ApiError.conflict("Issue the document before creating a filing packet");
  }
  const buffer = await buildPacketPdf(doc);
  const stored = await storePdf(buffer, `${doc.docNumber || "document"}-packet.pdf`);
  stored.kind = "generated";
  stored.uploadedBy = actor._id;
  stored.uploadedAt = new Date();
  doc.packet = stored;
  doc.status = "filed";
  doc.filedAt = new Date();
  doc.updatedBy = actor._id;
  await doc.save();
  await auditService.log({
    actor,
    action: "file",
    module: "documents",
    resourceType: "Document",
    resourceId: doc._id,
    req,
    metadata: { attachments: (doc.attachments || []).length },
  });
  return serializeDocument(doc);
}

module.exports = {
  variables,
  previewBindings,
  list,
  generate,
  getById,
  update,
  rebind,
  remove,
  print,
  issue,
  voidDocument,
  saveAttachments,
  createPacket,
  downloadFile,
};

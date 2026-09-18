const ServiceJob = require("../../models/ServiceJob");
const ServiceOffering = require("../../models/ServiceOffering");
const TaxRate = require("../../models/TaxRate");
const Lead = require("../../models/Lead");
const Invoice = require("../../models/Invoice");
const VerificationCase = require("../../models/VerificationCase");
const VerificationDocument = require("../../models/VerificationDocument");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializeJob } = require("../../utils/billingSerializer");
const auditService = require("../audit/audit.service");
const notificationService = require("../notifications/notification.service");
const { recomputeLeadRollup } = require("../verification/verification.service");
const { getSettings } = require("./settings.service");
const { nextJobNumber } = require("./numbering");
const { computeLine, computeTotals, taxSplitFor } = require("./tax.engine");
const { OPEN_JOB_STATUSES, CANCELABLE_JOB_STATUSES } = require("../../constants/billing");

const OWNER_SELECT = "name email avatarUrl";
const LEAD_SELECT = "name email stage gstin billingState billingAddress city country legalName phone pincode";

function notDeleted(extra = {}) {
  return { deletedAt: null, ...extra };
}

function oid(value) {
  if (!value || value === "null") return null;
  return value;
}

function pushHistory(job, action, actor, note = "") {
  job.history.push({ action, note, actorId: actor?._id || null, createdAt: new Date() });
}

async function loadTaxMap(ids) {
  const unique = [...new Set((ids || []).filter(Boolean).map(String))];
  if (!unique.length) return new Map();
  const rates = await TaxRate.find({ _id: { $in: unique }, deletedAt: null }).lean();
  return new Map(rates.map((item) => [String(item._id), item]));
}

async function resolveLines(rawLines = [], { split, defaultTaxRateId }) {
  const offeringIds = rawLines.map((line) => line.offeringId).filter(Boolean);
  const offerings = offeringIds.length
    ? await ServiceOffering.find({ _id: { $in: offeringIds }, deletedAt: null }).lean()
    : [];
  const offeringMap = new Map(offerings.map((item) => [String(item._id), item]));
  const taxIds = rawLines.map((line) => line.taxRateId).concat(offerings.map((item) => item.taxRateId)).concat([defaultTaxRateId]);
  const taxMap = await loadTaxMap(taxIds);

  return rawLines.map((line) => {
    const offering = line.offeringId ? offeringMap.get(String(line.offeringId)) : null;
    const taxRateId = oid(line.taxRateId) || offering?.taxRateId || defaultTaxRateId || null;
    const taxRate = taxRateId ? taxMap.get(String(taxRateId)) : null;
    return computeLine(
      {
        offeringId: offering?._id || oid(line.offeringId),
        documentKey: line.documentKey || offering?.documentKey || "",
        formDefinitionId: oid(line.formDefinitionId) || offering?.formDefinitionId || null,
        description: line.description || offering?.name || "Service",
        hsnSac: line.hsnSac || offering?.hsnSac || "",
        quantity: line.quantity == null ? 1 : line.quantity,
        unitPrice: line.unitPrice == null ? offering?.unitPrice || 0 : line.unitPrice,
        discount: line.discount || 0,
        taxRateId,
        taxRate: taxRate?.rate,
        taxName: taxRate?.name,
      },
      { split, taxRate }
    );
  });
}

async function applyTotals(job, settings) {
  const lead = job.leadId?.billingState != null ? job.leadId : await Lead.findById(job.leadId).select(LEAD_SELECT).lean();
  const split = taxSplitFor(settings.state, lead?.billingState || "");
  const lines = await resolveLines(job.lines || [], { split, defaultTaxRateId: settings.defaultTaxRateId });
  const totals = computeTotals(lines, job.discount);
  job.lines = lines;
  job.taxSplit = split;
  Object.assign(job, totals);
  return lead;
}

async function hydrate(id) {
  const job = await ServiceJob.findOne(notDeleted({ _id: id }))
    .populate("leadId", LEAD_SELECT)
    .populate("assigneeId", OWNER_SELECT)
    .lean();
  if (!job) throw ApiError.notFound("Service job not found");
  return serializeJob(job);
}

async function listJobs(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "dueAt", "jobNumber", "status", "grandTotal"]);
  const filter = notDeleted();
  if (query.status) filter.status = query.status;
  if (query.leadId) filter.leadId = query.leadId;
  if (query.assigneeId) filter.assigneeId = query.assigneeId;
  if (query.source) filter.source = query.source;
  if (query.documentKey) filter["lines.documentKey"] = query.documentKey;
  if (query.open === "true") filter.status = { $in: OPEN_JOB_STATUSES };
  if (query.search) {
    filter.$or = [
      { jobNumber: { $regex: query.search, $options: "i" } },
      { notes: { $regex: query.search, $options: "i" } },
    ];
  }
  const [items, total] = await Promise.all([
    ServiceJob.find(filter)
      .populate("leadId", LEAD_SELECT)
      .populate("assigneeId", OWNER_SELECT)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    ServiceJob.countDocuments(filter),
  ]);
  return { items: items.map(serializeJob), pagination: paginationMeta({ page, limit, total }) };
}

async function assertNoOpenGapJob(leadId, documentKeys, excludeId) {
  const keys = [...new Set((documentKeys || []).filter(Boolean))];
  if (!keys.length) return;
  const filter = notDeleted({
    leadId,
    status: { $in: OPEN_JOB_STATUSES },
    "lines.documentKey": { $in: keys },
  });
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await ServiceJob.findOne(filter).lean();
  if (existing) {
    throw ApiError.conflict("An open service job already exists for this certificate", {
      jobId: String(existing._id),
    });
  }
}

async function linkVerification(job) {
  const formId = job.lines.map((line) => line.formDefinitionId).find(Boolean);
  if (!formId) return;
  const openCase = await VerificationCase.findOne({
    leadId: job.leadId,
    formId,
    deletedAt: null,
    status: { $nin: ["cancelled", "verified"] },
  }).sort({ updatedAt: -1 });
  if (!openCase) return;
  job.verificationCaseId = openCase._id;
  if (!openCase.serviceJobId) {
    openCase.serviceJobId = job._id;
    await openCase.save();
  }
}

async function createJob(payload, actor, req) {
  const lead = await Lead.findOne(notDeleted({ _id: payload.leadId }));
  if (!lead) throw ApiError.notFound("Supplier not found");
  const settings = await getSettings();
  const documentKeys = (payload.lines || []).map((line) => line.documentKey).filter(Boolean);
  await assertNoOpenGapJob(lead._id, documentKeys);
  const job = new ServiceJob({
    jobNumber: await nextJobNumber(),
    leadId: lead._id,
    assigneeId: oid(payload.assigneeId) || actor?._id || null,
    status: "draft",
    source: payload.source || "manual",
    dueAt: payload.dueAt || (payload.slaDays ? new Date(Date.now() + Number(payload.slaDays) * 86400000) : null),
    notes: payload.notes || "",
    verificationCaseId: oid(payload.verificationCaseId),
    discount: payload.discount || 0,
    currency: settings.currency || "INR",
    createdBy: actor?._id || null,
    lines: payload.lines || [],
  });
  await applyTotals(job, settings);
  if (!job.dueAt) {
    const sla = (payload.lines || []).reduce((max, line) => Math.max(max, Number(line.slaDays) || 0), 0);
    if (sla) job.dueAt = new Date(Date.now() + sla * 86400000);
  }
  pushHistory(job, "created", actor, payload.notes || "");
  await job.save();
  await linkVerification(job);
  await job.save();
  await auditService.log({ actor, action: "create", module: "billing", resourceType: "ServiceJob", resourceId: job._id, req });
  if (job.assigneeId && String(job.assigneeId) !== String(actor?._id)) {
    await notificationService.create({
      userId: job.assigneeId,
      type: "billing_job_assigned",
      title: `Service job ${job.jobNumber}`,
      body: `${lead.name} — a certificate service job was assigned to you.`,
      data: { jobId: String(job._id), leadId: String(lead._id) },
    });
  }
  return hydrate(job._id);
}

async function updateJob(id, payload, actor, req) {
  const job = await ServiceJob.findOne(notDeleted({ _id: id }));
  if (!job) throw ApiError.notFound("Service job not found");
  if (!["draft", "confirmed"].includes(job.status)) {
    throw ApiError.conflict("Only draft or confirmed jobs can be edited");
  }
  if (payload.leadId && String(payload.leadId) !== String(job.leadId)) {
    const lead = await Lead.findOne(notDeleted({ _id: payload.leadId }));
    if (!lead) throw ApiError.notFound("Supplier not found");
    job.leadId = lead._id;
  }
  if (payload.assigneeId !== undefined) job.assigneeId = payload.assigneeId || null;
  if (payload.dueAt !== undefined) job.dueAt = payload.dueAt || null;
  if (payload.notes !== undefined) job.notes = payload.notes;
  if (payload.discount !== undefined) job.discount = payload.discount;
  if (payload.lines) job.lines = payload.lines;
  const settings = await getSettings();
  await applyTotals(job, settings);
  pushHistory(job, "updated", actor, payload.notes || "");
  await job.save();
  await auditService.log({ actor, action: "update", module: "billing", resourceType: "ServiceJob", resourceId: job._id, req });
  return hydrate(job._id);
}

async function transition(id, nextStatus, actor, req, { note, files, waivePayment } = {}) {
  const job = await ServiceJob.findOne(notDeleted({ _id: id }));
  if (!job) throw ApiError.notFound("Service job not found");
  const from = job.status;

  const allowed = {
    confirmed: ["draft"],
    in_progress: ["confirmed"],
    awaiting_authority: ["in_progress"],
    delivered: ["in_progress", "awaiting_authority"],
    closed: ["delivered"],
    cancelled: CANCELABLE_JOB_STATUSES,
  };
  if (!allowed[nextStatus]?.includes(from)) {
    throw ApiError.conflict(`Cannot move job from ${from} to ${nextStatus}`);
  }

  if (nextStatus === "closed") {
    if (!job.waivePayment && !waivePayment) {
      if (job.invoiceId) {
        const invoice = await Invoice.findById(job.invoiceId).lean();
        if (invoice && invoice.status !== "paid" && invoice.status !== "void") {
          throw ApiError.conflict("Close requires a paid invoice or an explicit payment waiver");
        }
      }
    } else {
      job.waivePayment = true;
    }
    job.closedAt = new Date();
  }
  if (nextStatus === "cancelled") job.cancelledAt = new Date();
  if (nextStatus === "delivered") {
    job.deliveredAt = new Date();
    await applyDeliveryToVerification(job, files, actor);
  }

  job.status = nextStatus;
  pushHistory(job, nextStatus, actor, note || "");
  await job.save();
  await auditService.log({
    actor,
    action: nextStatus,
    module: "billing",
    resourceType: "ServiceJob",
    resourceId: job._id,
    req,
    metadata: { from, note: note || "" },
  });
  return hydrate(job._id);
}

async function applyDeliveryToVerification(job, files, actor) {
  if (!job.verificationCaseId || !files?.length) return;
  const keys = [...new Set((job.lines || []).map((line) => line.documentKey).filter(Boolean))];
  if (!keys.length) return;
  for (const key of keys) {
    const doc = await VerificationDocument.findOne({
      caseId: job.verificationCaseId,
      documentKey: key,
      deletedAt: null,
    });
    if (!doc || doc.status === "verified") continue;
    doc.files = files.map((file) => ({
      ...file,
      uploadedAt: new Date(),
      uploadedBy: actor?._id || null,
    }));
    if (["pending_upload", "rejected", "expired"].includes(doc.status)) doc.status = "submitted";
    doc.reviews.push({
      action: "uploaded",
      note: `Uploaded from service job ${job.jobNumber}`,
      actorId: actor?._id || null,
      createdAt: new Date(),
    });
    await doc.save();
  }
  await recomputeLeadRollup(job.leadId);
}

async function gapsForLead(leadId) {
  const [documents, jobs, offerings] = await Promise.all([
    VerificationDocument.find({ leadId, deletedAt: null }).lean(),
    ServiceJob.find(notDeleted({ leadId, status: { $in: OPEN_JOB_STATUSES } })).lean(),
    ServiceOffering.find(notDeleted({ isActive: true, documentKey: { $ne: "" } })).lean(),
  ]);
  const openKeys = new Set();
  jobs.forEach((job) => {
    (job.lines || []).forEach((line) => {
      if (line.documentKey) openKeys.add(line.documentKey);
    });
  });
  const offeringByKey = new Map(offerings.map((item) => [item.documentKey, item]));
  const gapStatuses = ["pending_upload", "rejected", "expired"];
  return documents
    .filter((doc) => gapStatuses.includes(doc.status) && !openKeys.has(doc.documentKey))
    .map((doc) => ({
      documentId: String(doc._id),
      caseId: String(doc.caseId),
      documentKey: doc.documentKey,
      label: doc.label || doc.title || doc.documentKey,
      status: doc.status,
      offering: offeringByKey.get(doc.documentKey) ? serializeOfferingLite(offeringByKey.get(doc.documentKey)) : null,
    }));
}

function serializeOfferingLite(item) {
  return {
    id: String(item._id),
    code: item.code,
    name: item.name,
    unitPrice: Number(item.unitPrice) || 0,
    taxRateId: item.taxRateId ? String(item.taxRateId) : null,
    slaDays: Number(item.slaDays) || 0,
    documentKey: item.documentKey || "",
    formDefinitionId: item.formDefinitionId ? String(item.formDefinitionId) : null,
    hsnSac: item.hsnSac || "",
  };
}

module.exports = {
  listJobs,
  createJob,
  updateJob,
  getJob: hydrate,
  transition,
  gapsForLead,
  applyTotals,
};

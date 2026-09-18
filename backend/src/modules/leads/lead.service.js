const Lead = require("../../models/Lead");
const Contact = require("../../models/Contact");
const Activity = require("../../models/Activity");
const User = require("../../models/User");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializeLead, serializeContact } = require("../../utils/crmSerializer");
const auditService = require("../audit/audit.service");
const notificationService = require("../notifications/notification.service");

const OWNER_SELECT = "name email avatarUrl";

function notDeleted(extra = {}) {
  return { deletedAt: null, ...extra };
}

function cleanOwner(value) {
  if (value === undefined) return undefined;
  if (value === "" || value === null) return null;
  return value;
}

function applyStageTimestamps(lead, stage) {
  if (stage === "converted") {
    lead.convertedAt = lead.convertedAt || new Date();
    lead.lostAt = null;
    lead.disqualifiedAt = null;
  } else if (stage === "won") {
    lead.wonAt = lead.wonAt || new Date();
    lead.convertedAt = lead.convertedAt || new Date();
    lead.lostAt = null;
    lead.disqualifiedAt = null;
  } else if (stage === "lost") {
    lead.lostAt = new Date();
    lead.disqualifiedAt = null;
  } else if (stage === "disqualified") {
    lead.disqualifiedAt = new Date();
    lead.lostAt = null;
  } else {
    lead.lostAt = null;
    lead.disqualifiedAt = null;
    if (stage !== "converted" && stage !== "won") {
      lead.convertedAt = null;
      lead.wonAt = null;
    }
  }
}

async function recordStatusChange(lead, fromStage, toStage, note, actor) {
  const title = `${fromStage || "new"} → ${toStage}`;
  await Activity.create({
    type: "status_change",
    title,
    body: note || "",
    leadId: lead._id,
    assignedToId: actor?._id || null,
    status: "done",
  });
}

async function contactsFor(leadId) {
  const contacts = await Contact.find(notDeleted({ leadId })).sort({ isPrimary: -1, createdAt: 1 }).lean();
  return contacts.map(serializeContact);
}

async function getById(id) {
  const lead = await Lead.findOne(notDeleted({ _id: id })).populate("ownerId", OWNER_SELECT).lean();
  if (!lead) throw ApiError.notFound("Lead not found");
  return serializeLead(lead, await contactsFor(id));
}

async function list(query) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "name", "stage", "score", "country", "wonAt"]);
  const filter = notDeleted();
  if (query.stage) filter.stage = query.stage;
  if (query.source) filter.source = query.source;
  if (query.ownerId) filter.ownerId = query.ownerId;
  if (query.country) filter.country = { $regex: query.country, $options: "i" };
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { legalName: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
      { products: { $regex: query.search, $options: "i" } },
      { city: { $regex: query.search, $options: "i" } },
      { country: { $regex: query.search, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Lead.find(filter).populate("ownerId", OWNER_SELECT).sort(sort).skip(skip).limit(limit).lean(),
    Lead.countDocuments(filter),
  ]);

  const leadIds = items.map((item) => item._id);
  const contacts = await Contact.find(notDeleted({ leadId: { $in: leadIds } })).sort({ isPrimary: -1 }).lean();
  const grouped = {};
  contacts.forEach((contact) => {
    const key = String(contact.leadId);
    grouped[key] = grouped[key] || [];
    grouped[key].push(serializeContact(contact));
  });

  return {
    items: items.map((item) => serializeLead(item, grouped[String(item._id)] || [])),
    pagination: paginationMeta({ page, limit, total }),
  };
}

async function notifyOwnerChange(previousOwnerId, nextOwnerId, actor, title, body, data) {
  if (!nextOwnerId || String(nextOwnerId) === String(actor._id)) return;
  if (previousOwnerId && String(previousOwnerId) === String(nextOwnerId)) return;
  await notificationService.create({ userId: nextOwnerId, type: "crm_assignment", title, body, data });
}

async function create(payload, actor, req) {
  const { primaryContact, ...rest } = payload;
  const lead = await Lead.create({
    ...rest,
    ownerId: cleanOwner(payload.ownerId) || actor._id,
    score: payload.score || 0,
  });
  if (primaryContact?.name) {
    await Contact.create({
      leadId: lead._id,
      ...primaryContact,
      isPrimary: true,
    });
  }
  await auditService.log({
    actor,
    action: "create",
    module: "leads",
    resourceType: "Lead",
    resourceId: lead._id,
    req,
  });
  await notifyOwnerChange(null, lead.ownerId, actor, "Manufacturer assigned", `${lead.name} was assigned to you.`, {
    leadId: String(lead._id),
  });
  return getById(lead._id);
}

async function update(id, payload, actor, req) {
  const lead = await Lead.findOne(notDeleted({ _id: id }));
  if (!lead) throw ApiError.notFound("Lead not found");
  const previousOwner = lead.ownerId;
  const nextOwner = payload.ownerId !== undefined ? cleanOwner(payload.ownerId) : undefined;
  const previousStage = lead.stage;
  const { statusNote, ...rest } = payload;
  Object.assign(lead, {
    ...rest,
    ownerId: nextOwner === undefined ? lead.ownerId : nextOwner,
  });
  if (payload.stage) applyStageTimestamps(lead, payload.stage);
  if (payload.stage === "lost" && statusNote) lead.lostReason = statusNote;
  if (payload.stage === "disqualified" && statusNote) lead.disqualifiedReason = statusNote;
  await lead.save();
  if (payload.stage && payload.stage !== previousStage) {
    await recordStatusChange(lead, previousStage, payload.stage, statusNote, actor);
  }
  await auditService.log({
    actor,
    action: payload.stage ? "stage_move" : "update",
    module: "leads",
    resourceType: "Lead",
    resourceId: lead._id,
    req,
    metadata: { stage: lead.stage, statusNote: statusNote || "" },
  });
  await notifyOwnerChange(previousOwner, lead.ownerId, actor, "Manufacturer assigned", `${lead.name} was assigned to you.`, {
    leadId: String(lead._id),
  });
  return getById(lead._id);
}

async function convert(id, payload, actor, req, options = {}) {
  const lead = await Lead.findOne(notDeleted({ _id: id }));
  if (!lead) throw ApiError.notFound("Lead not found");
  const stage = payload.stage || "converted";
  if (lead.stage === "lost" || lead.stage === "disqualified") {
    throw ApiError.badRequest("A lost or disqualified lead cannot be converted");
  }
  if (stage === "won" && !options.skipOnboardingCheck) {
    const onboardingService = require("../forms/onboarding.service");
    const current = await onboardingService.getForSubject("lead", lead._id);
    if (current.formConfigured && !["submitted", "approved"].includes(current.onboarding?.status)) {
      throw ApiError.conflict("Submit supplier onboarding for review before marking this lead won");
    }
  }
  const previousStage = lead.stage;
  applyStageTimestamps(lead, stage);
  lead.stage = stage;
  await lead.save();
  await recordStatusChange(lead, previousStage, stage, payload.statusNote, actor);
  await auditService.log({
    actor,
    action: stage === "won" ? "won" : "convert",
    module: "leads",
    resourceType: "Lead",
    resourceId: lead._id,
    req,
    metadata: { stage, statusNote: payload.statusNote || "" },
  });
  let onboarding = null;
  if (stage === "converted") {
    const onboardingService = require("../forms/onboarding.service");
    const started = await onboardingService.start({ subjectType: "lead", subjectId: lead._id, actor, req });
    onboarding = started.onboarding;
  }
  return { lead: await getById(lead._id), onboarding };
}

async function startOnboarding(id, actor, req) {
  const lead = await Lead.findOne(notDeleted({ _id: id }));
  if (!lead) throw ApiError.notFound("Lead not found");
  if (!["converted", "won"].includes(lead.stage)) {
    throw ApiError.badRequest("Convert the lead before starting supplier onboarding");
  }
  const onboardingService = require("../forms/onboarding.service");
  const started = await onboardingService.start({ subjectType: "lead", subjectId: lead._id, actor, req });
  if (started.missingForm) {
    throw ApiError.conflict("Publish and tag a supplier onboarding form before starting");
  }
  return { lead: await getById(lead._id), onboarding: started.onboarding };
}

async function remove(id, actor, req) {
  const lead = await Lead.findOne(notDeleted({ _id: id }));
  if (!lead) throw ApiError.notFound("Lead not found");
  const now = new Date();
  lead.deletedAt = now;
  await lead.save();
  await Contact.updateMany({ leadId: lead._id, deletedAt: null }, { $set: { deletedAt: now } });
  await auditService.log({
    actor,
    action: "delete",
    module: "leads",
    resourceType: "Lead",
    resourceId: lead._id,
    req,
  });
}

async function addContact(leadId, payload, actor, req) {
  const lead = await Lead.findOne(notDeleted({ _id: leadId }));
  if (!lead) throw ApiError.notFound("Lead not found");
  if (payload.isPrimary) {
    await Contact.updateMany(notDeleted({ leadId }), { $set: { isPrimary: false } });
  }
  const contact = await Contact.create({ ...payload, leadId, isPrimary: Boolean(payload.isPrimary) });
  await auditService.log({
    actor,
    action: "create_contact",
    module: "leads",
    resourceType: "Contact",
    resourceId: contact._id,
    req,
    metadata: { leadId: String(leadId) },
  });
  return serializeContact(contact);
}

async function updateContact(leadId, contactId, payload, actor, req) {
  const contact = await Contact.findOne(notDeleted({ _id: contactId, leadId }));
  if (!contact) throw ApiError.notFound("Contact not found");
  if (payload.isPrimary) {
    await Contact.updateMany(notDeleted({ leadId, _id: { $ne: contactId } }), { $set: { isPrimary: false } });
  }
  Object.assign(contact, payload);
  await contact.save();
  await auditService.log({
    actor,
    action: "update_contact",
    module: "leads",
    resourceType: "Contact",
    resourceId: contact._id,
    req,
  });
  return serializeContact(contact);
}

async function removeContact(leadId, contactId, actor, req) {
  const contact = await Contact.findOne(notDeleted({ _id: contactId, leadId }));
  if (!contact) throw ApiError.notFound("Contact not found");
  contact.deletedAt = new Date();
  await contact.save();
  await auditService.log({
    actor,
    action: "delete_contact",
    module: "leads",
    resourceType: "Contact",
    resourceId: contact._id,
    req,
  });
}

async function assignees() {
  const users = await User.find(notDeleted({ status: "active" })).select("name email").sort({ name: 1 }).lean();
  return users.map((user) => ({ id: String(user._id), name: user.name, email: user.email }));
}

async function dashboard() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const [byStage, leadsThisWeek, overdueFollowUps, upcomingMeetings] = await Promise.all([
    Lead.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: "$stage", count: { $sum: 1 } } }]),
    Lead.countDocuments(notDeleted({ createdAt: { $gte: weekAgo } })),
    Activity.countDocuments(notDeleted({ type: "follow_up", status: "scheduled", dueAt: { $lt: now } })),
    Activity.find(
      notDeleted({
        type: { $in: ["meeting", "appointment", "call"] },
        status: "scheduled",
        startsAt: { $gte: now },
      })
    )
      .sort({ startsAt: 1 })
      .limit(5)
      .populate("leadId", "name email")
      .lean(),
  ]);

  const stageCounts = Object.fromEntries(byStage.map((row) => [row._id, row.count]));
  return {
    stageCounts,
    inProcess: (stageCounts.new || 0) + (stageCounts.contacted || 0) + (stageCounts.qualified || 0),
    converted: stageCounts.converted || 0,
    won: stageCounts.won || 0,
    lost: stageCounts.lost || 0,
    disqualified: stageCounts.disqualified || 0,
    leadsThisWeek,
    overdueFollowUps,
    upcomingMeetings: upcomingMeetings.map((item) => ({
      id: String(item._id),
      type: item.type,
      title: item.title,
      startsAt: item.startsAt,
      leadName: item.leadId?.name || "",
    })),
  };
}

module.exports = {
  list,
  getById,
  create,
  update,
  convert,
  startOnboarding,
  remove,
  addContact,
  updateContact,
  removeContact,
  assignees,
  dashboard,
};

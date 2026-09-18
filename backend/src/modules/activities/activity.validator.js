const Joi = require("joi");
const { ACTIVITY_TYPES, ACTIVITY_STATUSES } = require("../../constants/crm");

const objectId = Joi.string().hex().length(24);

const listSchema = Joi.object({
  query: Joi.object({
    type: Joi.string().valid(...ACTIVITY_TYPES),
    status: Joi.string().valid(...ACTIVITY_STATUSES),
    leadId: objectId,
    contactId: objectId,
    assignedToId: objectId,
    search: Joi.string().trim().allow(""),
    hasReminder: Joi.boolean().truthy("true").falsy("false"),
    sort: Joi.string(),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }),
});

const parentRule = Joi.object({
  type: Joi.string().valid(...ACTIVITY_TYPES).required(),
  title: Joi.string().trim().allow(""),
  body: Joi.string().trim().allow(""),
  leadId: objectId.required(),
  contactId: objectId.allow(null, ""),
  assignedToId: objectId.allow(null, ""),
  startsAt: Joi.date().allow(null, ""),
  endsAt: Joi.date().allow(null, ""),
  location: Joi.string().trim().allow(""),
  meetingUrl: Joi.string().trim().allow(""),
  dueAt: Joi.date().allow(null, ""),
  reminderAt: Joi.date().allow(null, ""),
  status: Joi.string().valid(...ACTIVITY_STATUSES),
}).custom((value, helpers) => {
  if (["appointment", "meeting", "call"].includes(value.type) && !value.startsAt) {
    return helpers.message("startsAt is required for calls, appointments, and meetings");
  }
  if (["follow_up", "task"].includes(value.type) && !value.dueAt) {
    return helpers.message("dueAt is required for follow-ups and tasks");
  }
  return value;
});

const createSchema = Joi.object({
  body: parentRule.required(),
});

const updateSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    type: Joi.string().valid(...ACTIVITY_TYPES),
    title: Joi.string().trim().allow(""),
    body: Joi.string().trim().allow(""),
    leadId: objectId,
    contactId: objectId.allow(null, ""),
    assignedToId: objectId.allow(null, ""),
    startsAt: Joi.date().allow(null, ""),
    endsAt: Joi.date().allow(null, ""),
    location: Joi.string().trim().allow(""),
    meetingUrl: Joi.string().trim().allow(""),
    dueAt: Joi.date().allow(null, ""),
    reminderAt: Joi.date().allow(null, ""),
    status: Joi.string().valid(...ACTIVITY_STATUSES),
  }).required(),
});

const idParamSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
});

const calendarQuerySchema = Joi.object({
  query: Joi.object({
    from: Joi.date().required(),
    to: Joi.date().required(),
    assignedToId: objectId,
  }),
});

module.exports = { listSchema, createSchema, updateSchema, idParamSchema, calendarQuerySchema };

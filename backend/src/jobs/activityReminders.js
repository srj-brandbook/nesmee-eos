const Activity = require("../models/Activity");
const notificationService = require("../modules/notifications/notification.service");
const logger = require("../config/logger");

async function processDueReminders() {
  const due = await Activity.find({
    deletedAt: null,
    status: "scheduled",
    reminderAt: { $lte: new Date(), $ne: null },
    remindedAt: null,
  }).limit(100);

  for (const activity of due) {
    const userId = activity.assignedToId;
    if (userId) {
      await notificationService.create({
        userId,
        type: "crm_reminder",
        title: activity.title || `${activity.type.replace("_", " ")} reminder`,
        body: activity.body || "You have a scheduled CRM activity.",
        data: {
          activityId: String(activity._id),
          type: activity.type,
          leadId: activity.leadId ? String(activity.leadId) : null,
          contactId: activity.contactId ? String(activity.contactId) : null,
        },
      });
    }
    activity.remindedAt = new Date();
    await activity.save();
  }

  if (due.length) logger.info({ count: due.length }, "CRM activity reminders sent");
  return due.length;
}

function startActivityReminders(cron) {
  return cron.schedule("* * * * *", () => {
    processDueReminders().catch((error) => {
      logger.error({ err: error }, "CRM reminder job failed");
    });
  });
}

module.exports = { processDueReminders, startActivityReminders };

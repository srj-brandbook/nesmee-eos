const Invoice = require("../models/Invoice");
const logger = require("../config/logger");
const notificationService = require("../modules/notifications/notification.service");
const { getSettings } = require("../modules/billing/settings.service");
const { refreshPayableStatus } = require("../modules/billing/invoice.service");

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function processOverdueInvoices(now = new Date()) {
  const today = startOfDay(now);
  const invoices = await Invoice.find({
    deletedAt: null,
    type: "invoice",
    status: { $in: ["issued", "partial"] },
    dueAt: { $ne: null, $lt: today },
  }).limit(200);

  let marked = 0;
  let notified = 0;
  const settings = await getSettings();
  const windows = Array.isArray(settings.reminderDays) ? settings.reminderDays : [0, 7, 14];

  for (const invoice of invoices) {
    const previous = invoice.status;
    refreshPayableStatus(invoice, now);
    if (invoice.status === "overdue" && previous !== "overdue") {
      await invoice.save();
      marked += 1;
      await notificationService.create({
        userId: invoice.createdBy,
        type: "billing_invoice_overdue",
        title: `Invoice overdue: ${invoice.invoiceNumber}`,
        body: `${invoice.billTo?.name || "Supplier"} still owes ${invoice.currency} ${Number(invoice.amountDue || 0).toFixed(2)}.`,
        data: { invoiceId: String(invoice._id), leadId: String(invoice.leadId) },
      }).catch(() => {});
      notified += 1;
      continue;
    }
    if (invoice.isModified()) await invoice.save();

    const due = startOfDay(invoice.dueAt);
    const daysLate = Math.round((today.getTime() - due.getTime()) / 86400000);
    if (windows.includes(daysLate) && invoice.createdBy) {
      await notificationService.create({
        userId: invoice.createdBy,
        type: "billing_invoice_overdue",
        title: `Invoice reminder: ${invoice.invoiceNumber}`,
        body: `${invoice.billTo?.name || "Supplier"} is ${daysLate} day${daysLate === 1 ? "" : "s"} overdue.`,
        data: { invoiceId: String(invoice._id), leadId: String(invoice.leadId), daysLate },
      }).catch(() => {});
      notified += 1;
    }
  }

  if (marked || notified) logger.info({ marked, notified }, "Billing overdue job ran");
  return { marked, notified };
}

function startInvoiceOverdue(cron) {
  return cron.schedule("20 6 * * *", () => {
    processOverdueInvoices().catch((error) => {
      logger.error({ err: error }, "Billing overdue job failed");
    });
  });
}

module.exports = { processOverdueInvoices, startInvoiceOverdue };

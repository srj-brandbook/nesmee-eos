const Invoice = require("../../models/Invoice");
const Payment = require("../../models/Payment");
const ServiceJob = require("../../models/ServiceJob");
const { money } = require("./tax.engine");

function notDeleted(extra = {}) {
  return { deletedAt: null, ...extra };
}

function startOfMonth(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function summary(now = new Date()) {
  const [openInvoices, monthPayments, jobs] = await Promise.all([
    Invoice.find(notDeleted({ type: "invoice", status: { $in: ["issued", "partial", "overdue"] } })).lean(),
    Payment.find(notDeleted({ status: "recorded", paidAt: { $gte: startOfMonth(now) } })).lean(),
    ServiceJob.find(notDeleted({ status: { $nin: ["cancelled"] } })).select("status grandTotal").lean(),
  ]);

  const outstanding = money(openInvoices.reduce((sum, item) => sum + (item.amountDue || 0), 0));
  const overdueItems = openInvoices.filter((item) => item.status === "overdue");
  const overdue = money(overdueItems.reduce((sum, item) => sum + (item.amountDue || 0), 0));
  const collectedMtd = money(monthPayments.reduce((sum, item) => sum + (item.amount || 0), 0));

  const jobsByStatus = {};
  jobs.forEach((job) => {
    jobsByStatus[job.status] = (jobsByStatus[job.status] || 0) + 1;
  });

  return {
    outstanding,
    overdue,
    overdueCount: overdueItems.length,
    collectedMtd,
    openInvoiceCount: openInvoices.length,
    jobsInFlight: jobs.filter((job) => ["confirmed", "in_progress", "awaiting_authority", "delivered"].includes(job.status)).length,
    jobsByStatus,
  };
}

module.exports = { summary };

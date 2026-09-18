const { success } = require("../../utils/ApiResponse");
const settingsService = require("./settings.service");
const catalogService = require("./catalog.service");
const jobService = require("./job.service");
const invoiceService = require("./invoice.service");
const paymentService = require("./payment.service");
const reportsService = require("./reports.service");

async function getSettings(req, res) {
  const settings = await settingsService.getSettings();
  return success(res, { message: "Billing settings fetched", data: { settings } });
}

async function updateSettings(req, res) {
  const settings = await settingsService.updateSettings(req.body, req.user, req);
  return success(res, { message: "Billing settings updated", data: { settings } });
}

async function listTaxRates(req, res) {
  const data = await catalogService.listTaxRates(req.query);
  return success(res, { message: "Tax rates fetched", data });
}

async function createTaxRate(req, res) {
  const taxRate = await catalogService.createTaxRate(req.body, req.user, req);
  return success(res, { message: "Tax rate created", data: { taxRate }, status: 201 });
}

async function updateTaxRate(req, res) {
  const taxRate = await catalogService.updateTaxRate(req.params.id, req.body, req.user, req);
  return success(res, { message: "Tax rate updated", data: { taxRate } });
}

async function removeTaxRate(req, res) {
  await catalogService.removeTaxRate(req.params.id, req.user, req);
  return success(res, { message: "Tax rate deleted", data: null });
}

async function listOfferings(req, res) {
  const data = await catalogService.listOfferings(req.query);
  return success(res, { message: "Services fetched", data });
}

async function createOffering(req, res) {
  const service = await catalogService.createOffering(req.body, req.user, req);
  return success(res, { message: "Service created", data: { service }, status: 201 });
}

async function getOffering(req, res) {
  const service = await catalogService.getOffering(req.params.id);
  return success(res, { message: "Service fetched", data: { service } });
}

async function updateOffering(req, res) {
  const service = await catalogService.updateOffering(req.params.id, req.body, req.user, req);
  return success(res, { message: "Service updated", data: { service } });
}

async function removeOffering(req, res) {
  await catalogService.removeOffering(req.params.id, req.user, req);
  return success(res, { message: "Service deleted", data: null });
}

async function listJobs(req, res) {
  const data = await jobService.listJobs(req.query);
  return success(res, { message: "Jobs fetched", data });
}

async function jobGaps(req, res) {
  const items = await jobService.gapsForLead(req.query.leadId);
  return success(res, { message: "Certificate gaps fetched", data: { items } });
}

async function createJob(req, res) {
  const job = await jobService.createJob(req.body, req.user, req);
  return success(res, { message: "Service job created", data: { job }, status: 201 });
}

async function getJob(req, res) {
  const job = await jobService.getJob(req.params.id);
  return success(res, { message: "Service job fetched", data: { job } });
}

async function updateJob(req, res) {
  const job = await jobService.updateJob(req.params.id, req.body, req.user, req);
  return success(res, { message: "Service job updated", data: { job } });
}

async function confirmJob(req, res) {
  const job = await jobService.transition(req.params.id, "confirmed", req.user, req, req.body || {});
  return success(res, { message: "Job confirmed", data: { job } });
}

async function startJob(req, res) {
  const job = await jobService.transition(req.params.id, "in_progress", req.user, req, req.body || {});
  return success(res, { message: "Job started", data: { job } });
}

async function awaitAuthority(req, res) {
  const job = await jobService.transition(req.params.id, "awaiting_authority", req.user, req, req.body || {});
  return success(res, { message: "Job waiting on authority", data: { job } });
}

async function deliverJob(req, res) {
  const job = await jobService.transition(req.params.id, "delivered", req.user, req, req.body || {});
  return success(res, { message: "Job delivered", data: { job } });
}

async function closeJob(req, res) {
  const job = await jobService.transition(req.params.id, "closed", req.user, req, req.body || {});
  return success(res, { message: "Job closed", data: { job } });
}

async function cancelJob(req, res) {
  const job = await jobService.transition(req.params.id, "cancelled", req.user, req, req.body || {});
  return success(res, { message: "Job cancelled", data: { job } });
}

async function listInvoices(req, res) {
  const data = await invoiceService.listInvoices(req.query);
  return success(res, { message: "Invoices fetched", data });
}

async function createInvoice(req, res) {
  const invoice = await invoiceService.createInvoice(req.body, req.user, req);
  return success(res, { message: "Invoice created", data: { invoice }, status: 201 });
}

async function getInvoice(req, res) {
  const invoice = await invoiceService.getInvoice(req.params.id);
  return success(res, { message: "Invoice fetched", data: { invoice } });
}

async function updateInvoice(req, res) {
  const invoice = await invoiceService.updateInvoice(req.params.id, req.body, req.user, req);
  return success(res, { message: "Invoice updated", data: { invoice } });
}

async function issueInvoice(req, res) {
  const invoice = await invoiceService.issueInvoice(req.params.id, req.user, req);
  return success(res, { message: "Invoice issued", data: { invoice } });
}

async function voidInvoice(req, res) {
  const invoice = await invoiceService.voidInvoice(req.params.id, req.user, req);
  return success(res, { message: "Invoice voided", data: { invoice } });
}

async function creditNote(req, res) {
  const invoice = await invoiceService.createCreditNote(req.params.id, req.body || {}, req.user, req);
  return success(res, { message: "Credit note created", data: { invoice }, status: 201 });
}

async function printInvoice(req, res) {
  const data = await invoiceService.printInvoice(req.params.id);
  return success(res, { message: "Invoice print data fetched", data });
}

async function listPayments(req, res) {
  const data = await paymentService.listPayments(req.query);
  return success(res, { message: "Payments fetched", data });
}

async function createPayment(req, res) {
  const payment = await paymentService.createPayment(req.body, req.user, req);
  return success(res, { message: "Payment recorded", data: { payment }, status: 201 });
}

async function getPayment(req, res) {
  const payment = await paymentService.getPayment(req.params.id);
  return success(res, { message: "Payment fetched", data: { payment } });
}

async function reversePayment(req, res) {
  const payment = await paymentService.reversePayment(req.params.id, req.user, req);
  return success(res, { message: "Payment reversed", data: { payment } });
}

async function printPayment(req, res) {
  const data = await paymentService.printPayment(req.params.id);
  return success(res, { message: "Payment receipt fetched", data });
}

async function reports(req, res) {
  const data = await reportsService.summary();
  return success(res, { message: "Billing summary fetched", data });
}

module.exports = {
  getSettings,
  updateSettings,
  listTaxRates,
  createTaxRate,
  updateTaxRate,
  removeTaxRate,
  listOfferings,
  createOffering,
  getOffering,
  updateOffering,
  removeOffering,
  listJobs,
  jobGaps,
  createJob,
  getJob,
  updateJob,
  confirmJob,
  startJob,
  awaitAuthority,
  deliverJob,
  closeJob,
  cancelJob,
  listInvoices,
  createInvoice,
  getInvoice,
  updateInvoice,
  issueInvoice,
  voidInvoice,
  creditNote,
  printInvoice,
  listPayments,
  createPayment,
  getPayment,
  reversePayment,
  printPayment,
  reports,
};

const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/authenticate");
const { requirePermission } = require("../../middleware/requirePermission");
const controller = require("./billing.controller");
const v = require("./billing.validator");

const router = express.Router();
router.use(authenticate);

function perm(name) {
  return requirePermission(name);
}

router.get("/settings", perm("billing.settings.view"), catchAsync(controller.getSettings));
router.patch("/settings", perm("billing.settings.update"), validate(v.updateSettings), catchAsync(controller.updateSettings));

router.get("/reports/summary", perm("billing.reports.view"), catchAsync(controller.reports));

router.get("/tax-rates", perm("services.view"), validate(v.listTaxRates), catchAsync(controller.listTaxRates));
router.post("/tax-rates", perm("billing.settings.update"), validate(v.createTaxRate), catchAsync(controller.createTaxRate));
router.patch("/tax-rates/:id", perm("billing.settings.update"), validate(v.updateTaxRate), catchAsync(controller.updateTaxRate));
router.delete("/tax-rates/:id", perm("billing.settings.update"), validate(v.idParam), catchAsync(controller.removeTaxRate));

router.get("/services", perm("services.view"), validate(v.listOfferings), catchAsync(controller.listOfferings));
router.post("/services", perm("services.create"), validate(v.createOffering), catchAsync(controller.createOffering));
router.get("/services/:id", perm("services.view"), validate(v.idParam), catchAsync(controller.getOffering));
router.patch("/services/:id", perm("services.update"), validate(v.updateOffering), catchAsync(controller.updateOffering));
router.delete("/services/:id", perm("services.delete"), validate(v.idParam), catchAsync(controller.removeOffering));

router.get("/jobs", perm("services.jobs.view"), validate(v.listJobs), catchAsync(controller.listJobs));
router.get("/jobs/gaps", perm("services.jobs.view"), validate(v.gapsQuery), catchAsync(controller.jobGaps));
router.post("/jobs", perm("services.jobs.create"), validate(v.createJob), catchAsync(controller.createJob));
router.get("/jobs/:id", perm("services.jobs.view"), validate(v.idParam), catchAsync(controller.getJob));
router.patch("/jobs/:id", perm("services.jobs.update"), validate(v.updateJob), catchAsync(controller.updateJob));
router.post("/jobs/:id/confirm", perm("services.jobs.update"), validate(v.jobAction), catchAsync(controller.confirmJob));
router.post("/jobs/:id/start", perm("services.jobs.fulfill"), validate(v.jobAction), catchAsync(controller.startJob));
router.post("/jobs/:id/await-authority", perm("services.jobs.fulfill"), validate(v.jobAction), catchAsync(controller.awaitAuthority));
router.post("/jobs/:id/deliver", perm("services.jobs.fulfill"), validate(v.jobAction), catchAsync(controller.deliverJob));
router.post("/jobs/:id/close", perm("services.jobs.fulfill"), validate(v.jobAction), catchAsync(controller.closeJob));
router.post("/jobs/:id/cancel", perm("services.jobs.update"), validate(v.jobAction), catchAsync(controller.cancelJob));

router.get("/invoices", perm("invoices.view"), validate(v.listInvoices), catchAsync(controller.listInvoices));
router.post("/invoices", perm("invoices.create"), validate(v.createInvoice), catchAsync(controller.createInvoice));
router.get("/invoices/:id/print", perm("invoices.view"), validate(v.idParam), catchAsync(controller.printInvoice));
router.get("/invoices/:id", perm("invoices.view"), validate(v.idParam), catchAsync(controller.getInvoice));
router.patch("/invoices/:id", perm("invoices.update"), validate(v.updateInvoice), catchAsync(controller.updateInvoice));
router.post("/invoices/:id/issue", perm("invoices.issue"), validate(v.idParam), catchAsync(controller.issueInvoice));
router.post("/invoices/:id/void", perm("invoices.void"), validate(v.idParam), catchAsync(controller.voidInvoice));
router.post("/invoices/:id/credit-note", perm("invoices.create"), validate(v.creditNote), catchAsync(controller.creditNote));

router.get("/payments", perm("payments.view"), validate(v.listPayments), catchAsync(controller.listPayments));
router.post("/payments", perm("payments.create"), validate(v.createPayment), catchAsync(controller.createPayment));
router.get("/payments/:id/print", perm("payments.view"), validate(v.idParam), catchAsync(controller.printPayment));
router.get("/payments/:id", perm("payments.view"), validate(v.idParam), catchAsync(controller.getPayment));
router.post("/payments/:id/reverse", perm("payments.reverse"), validate(v.idParam), catchAsync(controller.reversePayment));

module.exports = router;

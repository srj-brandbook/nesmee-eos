const { setupDb, teardownDb, login, createMember } = require("./helpers");
const env = require("../src/config/env");
const { processOverdueInvoices } = require("../src/jobs/invoiceOverdue");
const Invoice = require("../src/models/Invoice");

beforeAll(setupDb);
afterAll(teardownDb);

function csrf(req) {
  return req.set("Origin", "http://localhost:3000").set("X-Requested-With", "XMLHttpRequest");
}

describe("billing", () => {
  it("blocks members from viewing services", async () => {
    await createMember({ email: "billing-member@example.com" });
    const { agent } = await login("billing-member@example.com", "Password123");
    const res = await csrf(agent.get("/api/v1/billing/services"));
    expect(res.status).toBe(403);
  });

  it("creates catalog items, jobs, GST invoices, payments, credit notes, and voids", async () => {
    const { agent } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);

    const settings = await csrf(agent.patch("/api/v1/billing/settings")).send({
      legalName: "Nesmee EOS",
      state: "Maharashtra",
      city: "Mumbai",
      gstin: "27AAAAA0000A1Z5",
      invoicePrefix: "INV",
      defaultDueDays: 7,
    });
    expect(settings.status).toBe(200);
    expect(settings.body.data.settings.state).toBe("Maharashtra");

    const tax = await csrf(agent.post("/api/v1/billing/tax-rates")).send({
      name: "GST 18%",
      code: `GST18-${Date.now()}`,
      rate: 18,
      isDefault: true,
    });
    expect(tax.status).toBe(201);
    const taxRateId = tax.body.data.taxRate.id;

    await csrf(agent.patch("/api/v1/billing/settings")).send({ defaultTaxRateId: taxRateId });

    const service = await csrf(agent.post("/api/v1/billing/services")).send({
      code: `FSSAI-${Date.now()}`,
      name: "FSSAI license procurement",
      category: "certificate",
      unitPrice: 10000,
      taxRateId,
      slaDays: 14,
      documentKey: "fssai_license",
      hsnSac: "9983",
    });
    expect(service.status).toBe(201);
    const offeringId = service.body.data.service.id;

    const lead = await csrf(agent.post("/api/v1/leads")).send({
      name: "Pune Frozen Foods",
      country: "India",
      city: "Pune",
      billingState: "Gujarat",
      gstin: "24BBBBB1111B1Z2",
    });
    expect(lead.status).toBe(201);
    const leadId = lead.body.data.lead.id;

    const job = await csrf(agent.post("/api/v1/billing/jobs")).send({
      leadId,
      source: "verification_gap",
      lines: [{ offeringId, quantity: 1, unitPrice: 10000 }],
    });
    expect(job.status).toBe(201);
    expect(job.body.data.job.jobNumber).toMatch(/^JOB-/);
    expect(job.body.data.job.taxSplit).toBe("inter");
    expect(job.body.data.job.igst).toBe(1800);
    expect(job.body.data.job.grandTotal).toBe(11800);
    const jobId = job.body.data.job.id;

    const confirmed = await csrf(agent.post(`/api/v1/billing/jobs/${jobId}/confirm`)).send({});
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.job.status).toBe("confirmed");

    const invoice = await csrf(agent.post("/api/v1/billing/invoices")).send({ jobId, leadId });
    expect(invoice.status).toBe(201);
    expect(invoice.body.data.invoice.status).toBe("draft");
    expect(invoice.body.data.invoice.igst).toBe(1800);
    expect(invoice.body.data.invoice.cgst).toBe(0);
    const invoiceId = invoice.body.data.invoice.id;

    const intra = await csrf(agent.patch(`/api/v1/billing/invoices/${invoiceId}`)).send({
      billTo: { state: "Maharashtra", name: "Pune Frozen Foods" },
    });
    expect(intra.status).toBe(200);
    expect(intra.body.data.invoice.taxSplit).toBe("intra");
    expect(intra.body.data.invoice.cgst).toBe(900);
    expect(intra.body.data.invoice.sgst).toBe(900);
    expect(intra.body.data.invoice.igst).toBe(0);

    const issued = await csrf(agent.post(`/api/v1/billing/invoices/${invoiceId}/issue`)).send({});
    expect(issued.status).toBe(200);
    expect(issued.body.data.invoice.status).toBe("issued");
    expect(issued.body.data.invoice.invoiceNumber).toMatch(/^INV-/);
    const firstNumber = issued.body.data.invoice.invoiceNumber;

    const locked = await csrf(agent.patch(`/api/v1/billing/invoices/${invoiceId}`)).send({ notes: "should fail" });
    expect(locked.status).toBe(409);

    const overpay = await csrf(agent.post("/api/v1/billing/payments")).send({
      invoiceId,
      amount: 20000,
      method: "upi",
    });
    expect(overpay.status).toBe(400);

    const payment = await csrf(agent.post("/api/v1/billing/payments")).send({
      invoiceId,
      amount: 5000,
      method: "bank_transfer",
      reference: "NEFT123",
    });
    expect(payment.status).toBe(201);
    expect(payment.body.data.payment.paymentNumber).toMatch(/^PAY-/);
    const paymentId = payment.body.data.payment.id;

    const afterPartial = await csrf(agent.get(`/api/v1/billing/invoices/${invoiceId}`));
    expect(afterPartial.body.data.invoice.status).toBe("partial");
    expect(afterPartial.body.data.invoice.amountPaid).toBe(5000);
    expect(afterPartial.body.data.invoice.amountDue).toBe(6800);

    const rest = await csrf(agent.post("/api/v1/billing/payments")).send({
      invoiceId,
      amount: 6800,
      method: "upi",
    });
    expect(rest.status).toBe(201);
    const paid = await csrf(agent.get(`/api/v1/billing/invoices/${invoiceId}`));
    expect(paid.body.data.invoice.status).toBe("paid");
    expect(paid.body.data.invoice.amountDue).toBe(0);

    const reversed = await csrf(agent.post(`/api/v1/billing/payments/${paymentId}/reverse`)).send({});
    expect(reversed.status).toBe(200);
    const afterReverse = await csrf(agent.get(`/api/v1/billing/invoices/${invoiceId}`));
    expect(afterReverse.body.data.invoice.status).toBe("partial");
    expect(afterReverse.body.data.invoice.amountPaid).toBe(6800);

    const credit = await csrf(agent.post(`/api/v1/billing/invoices/${invoiceId}/credit-note`)).send({});
    expect(credit.status).toBe(201);
    const creditId = credit.body.data.invoice.id;
    const issuedCredit = await csrf(agent.post(`/api/v1/billing/invoices/${creditId}/issue`)).send({});
    expect(issuedCredit.status).toBe(200);
    expect(issuedCredit.body.data.invoice.invoiceNumber).toMatch(/^CN-/);

    const started = await csrf(agent.post(`/api/v1/billing/jobs/${jobId}/start`)).send({});
    expect(started.status).toBe(200);
    const delivered = await csrf(agent.post(`/api/v1/billing/jobs/${jobId}/deliver`)).send({});
    expect(delivered.status).toBe(200);
    const closed = await csrf(agent.post(`/api/v1/billing/jobs/${jobId}/close`)).send({ waivePayment: true });
    expect(closed.status).toBe(200);
    expect(closed.body.data.job.status).toBe("closed");

    const print = await csrf(agent.get(`/api/v1/billing/invoices/${invoiceId}/print`));
    expect(print.status).toBe(200);
    expect(print.body.data.settings.legalName).toBe("Nesmee EOS");
    expect(print.body.data.invoice.invoiceNumber).toBe(firstNumber);

    const summary = await csrf(agent.get("/api/v1/billing/reports/summary"));
    expect(summary.status).toBe(200);
    expect(summary.body.data).toHaveProperty("outstanding");

    const overdueInvoice = await csrf(agent.post("/api/v1/billing/invoices")).send({
      leadId,
      lines: [{ description: "Overdue test", quantity: 1, unitPrice: 1000, taxRateId }],
    });
    const overdueId = overdueInvoice.body.data.invoice.id;
    await csrf(agent.post(`/api/v1/billing/invoices/${overdueId}/issue`)).send({});
    await Invoice.updateOne({ _id: overdueId }, { $set: { dueAt: new Date("2020-01-01") } });
    const overdueRun = await processOverdueInvoices(new Date("2020-01-15"));
    expect(overdueRun.marked).toBeGreaterThanOrEqual(1);
    const overdueFetched = await csrf(agent.get(`/api/v1/billing/invoices/${overdueId}`));
    expect(overdueFetched.body.data.invoice.status).toBe("overdue");

    const voided = await csrf(agent.post(`/api/v1/billing/invoices/${overdueId}/void`)).send({});
    expect(voided.status).toBe(200);
    expect(voided.body.data.invoice.status).toBe("void");
  });
});

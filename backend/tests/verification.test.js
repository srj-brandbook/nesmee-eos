const { setupDb, teardownDb, login, createMember, createUserWithRole } = require("./helpers");
const env = require("../src/config/env");
const { processVerificationExpiry } = require("../src/jobs/verificationExpiry");
const VerificationDocument = require("../src/models/VerificationDocument");
const Lead = require("../src/models/Lead");
const Notification = require("../src/models/Notification");

beforeAll(setupDb);
afterAll(teardownDb);

function csrf(req) {
  return req.set("Origin", "http://localhost:3000").set("X-Requested-With", "XMLHttpRequest");
}

function sampleFile(name = "permit.pdf") {
  return {
    url: `https://res.cloudinary.com/demo/raw/upload/${name}`,
    publicId: name.replace(".pdf", ""),
    name,
    size: 2048,
    type: "application/pdf",
    resourceType: "raw",
  };
}

function nextYear() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

describe("supplier verification", () => {
  it("blocks members from listing verification cases", async () => {
    await createMember({ email: "verification-member@example.com" });
    const { agent } = await login("verification-member@example.com", "Password123");
    const res = await csrf(agent.get("/api/v1/verification"));
    expect(res.status).toBe(403);
  });

  it("assigns, fills, submits, and verifies documents, then expires them", async () => {
    const { agent } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);

    const leadRes = await csrf(agent.post("/api/v1/leads")).send({
      name: "Arctic Foods Pvt Ltd",
      country: "India",
      products: "Frozen seafood",
    });
    expect(leadRes.status).toBe(201);
    const leadId = leadRes.body.data.lead.id;

    const blockedNew = await csrf(agent.post("/api/v1/verification")).send({
      leadId,
      formId: leadId,
    });
    expect(blockedNew.status).toBeGreaterThanOrEqual(400);

    const converted = await csrf(agent.post(`/api/v1/leads/${leadId}/convert`)).send({ stage: "converted" });
    expect(converted.status).toBe(200);

    const general = await csrf(agent.post("/api/v1/forms")).send({
      name: "General intake",
      template: "blank",
      purpose: "general",
    });
    expect(general.status).toBe(201);
    const unpublishedAssign = await csrf(agent.post("/api/v1/verification")).send({
      leadId,
      formId: general.body.data.form.id,
    });
    expect(unpublishedAssign.status).toBeGreaterThanOrEqual(400);

    const created = await csrf(agent.post("/api/v1/forms")).send({
      name: "Frozen food processing permit",
      template: "frozen_food_permit",
    });
    expect(created.status).toBe(201);
    expect(created.body.data.form.purpose).toBe("supplier_verification");
    const formId = created.body.data.form.id;

    const published = await csrf(agent.post(`/api/v1/forms/${formId}/publish`)).send({});
    expect(published.status).toBe(200);

    const assigned = await csrf(agent.post("/api/v1/verification")).send({
      leadId,
      formId,
      note: "Need frozen permit pack",
    });
    expect(assigned.status).toBe(201);
    const caseId = assigned.body.data.case.id;
    expect(assigned.body.data.case.status).toBe("assigned");
    expect(assigned.body.data.case.documents.length).toBeGreaterThanOrEqual(2);

    const requiredDocs = assigned.body.data.case.documents.filter((item) => item.required);
    expect(requiredDocs.length).toBeGreaterThanOrEqual(2);

    const values = {
      facility_name: "Arctic Foods Pvt Ltd",
      facility_address: "12 Harbour Road, Kochi",
      fssai_number: "10012011000000",
      processing_types: ["chilled"],
    };

    const saved = await csrf(agent.patch(`/api/v1/verification/${caseId}`)).send({ values });
    expect(saved.status).toBe(200);
    expect(saved.body.data.case.status).toBe("in_progress");

    const issuedAt = "2026-01-15";
    const expiresAt = nextYear();
    for (const doc of requiredDocs) {
      const updated = await csrf(agent.patch(`/api/v1/verification/documents/${doc.id}`)).send({
        title: doc.label,
        description: "Uploaded for review",
        issuer: "FSSAI",
        documentNumber: `DOC-${doc.documentKey}`,
        issuedAt,
        expiresAt,
        files: [sampleFile(`${doc.documentKey}.pdf`)],
      });
      expect(updated.status).toBe(200);
    }

    const submitted = await csrf(agent.post(`/api/v1/verification/${caseId}/submit`)).send({ values });
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.case.status).toBe("submitted");

    const refreshed = submitted.body.data.case.documents.filter((item) => item.required);
    for (const doc of refreshed) {
      const reviewed = await csrf(agent.post(`/api/v1/verification/documents/${doc.id}/review`)).send({
        decision: "verified",
        note: "Matches facility records",
      });
      expect(reviewed.status).toBe(200);
      expect(reviewed.body.data.case.status).toBe("submitted");
    }

    const approved = await csrf(agent.post(`/api/v1/verification/${caseId}/review`)).send({
      decision: "verified",
      note: "All documents match supplier records",
    });
    expect(approved.status).toBe(200);
    expect(approved.body.data.case.status).toBe("verified");

    const summary = await csrf(agent.get(`/api/v1/verification/leads/${leadId}/summary`));
    expect(summary.status).toBe(200);
    expect(summary.body.data.status).toBe("verified");

    const lead = await csrf(agent.get(`/api/v1/leads/${leadId}`));
    expect(lead.body.data.lead.verificationStatus).toBe("verified");

    const firstRequired = approved.body.data.case.documents.find((item) => item.required);
    await VerificationDocument.updateOne({ _id: firstRequired.id }, { $set: { expiresAt: new Date("2020-01-01") } });
    const job = await processVerificationExpiry(new Date("2026-09-15"));
    expect(job.expired).toBeGreaterThanOrEqual(1);

    const expiredCase = await csrf(agent.get(`/api/v1/verification/${caseId}`));
    expect(expiredCase.body.data.case.status).toBe("expired");
    const expiredLead = await Lead.findById(leadId);
    expect(expiredLead.verificationStatus).toBe("expired");
    const notices = await Notification.find({ type: "verification_expiring" });
    expect(notices.length).toBeGreaterThanOrEqual(1);
  });

  it("returns a rejected document to the assignee", async () => {
    const { agent } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);
    const sales = await createUserWithRole("sales", { email: "verify-sales@example.com", name: "Sales Completer" });

    const leadRes = await csrf(agent.post("/api/v1/leads")).send({ name: "Himalaya Frozen Co", country: "India" });
    const leadId = leadRes.body.data.lead.id;
    await csrf(agent.post(`/api/v1/leads/${leadId}/convert`)).send({ stage: "converted" });

    const formRes = await csrf(agent.post("/api/v1/forms")).send({
      name: "Himalaya frozen permit",
      template: "frozen_food_permit",
    });
    const formId = formRes.body.data.form.id;
    await csrf(agent.post(`/api/v1/forms/${formId}/publish`)).send({});

    const assigned = await csrf(agent.post("/api/v1/verification")).send({
      leadId,
      formId,
      assignedToId: String(sales._id),
    });
    expect(assigned.status).toBe(201);
    const caseId = assigned.body.data.case.id;
    const values = {
      facility_name: "Himalaya Frozen Co",
      facility_address: "Leh",
      fssai_number: "10012011000001",
      processing_types: ["ambient"],
    };
    const requiredDocs = assigned.body.data.case.documents.filter((item) => item.required);
    for (const doc of requiredDocs) {
      await csrf(agent.patch(`/api/v1/verification/documents/${doc.id}`)).send({
        title: doc.label,
        issuer: "State",
        documentNumber: "1",
        issuedAt: "2026-02-01",
        expiresAt: nextYear(),
        files: [sampleFile(`${doc.documentKey}.pdf`)],
      });
    }
    const submitted = await csrf(agent.post(`/api/v1/verification/${caseId}/submit`)).send({ values });
    expect(submitted.status).toBe(200);

    const first = submitted.body.data.case.documents.find((item) => item.required);
    const rejected = await csrf(agent.post(`/api/v1/verification/documents/${first.id}/review`)).send({
      decision: "rejected",
      note: "Stamp is unreadable",
    });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.case.status).toBe("submitted");
    expect(rejected.body.data.document.status).toBe("rejected");
    const returnedReview = rejected.body.data.document.reviews.find((item) => item.action === "rejected");
    expect(returnedReview).toBeTruthy();
    expect(returnedReview.snapshot?.files?.[0]?.publicId).toBe(first.files[0].publicId);
    expect(returnedReview.snapshot?.issuer).toBe("State");

    const returned = await csrf(agent.post(`/api/v1/verification/${caseId}/review`)).send({
      decision: "rejected",
      note: "Stamp is unreadable — please reupload a clearer copy",
    });
    expect(returned.status).toBe(200);
    expect(returned.body.data.case.status).toBe("rejected");
    expect(returned.body.data.case.reviewNote).toContain("unreadable");

    const replacement = await csrf(agent.patch(`/api/v1/verification/documents/${first.id}`)).send({
      title: first.label,
      issuer: "State",
      documentNumber: "2",
      issuedAt: "2026-02-01",
      expiresAt: nextYear(),
      files: [sampleFile("replacement.pdf")],
    });
    expect(replacement.status).toBe(200);
    const replacedReview = replacement.body.data.document.reviews.find((item) => item.action === "replaced");
    expect(replacedReview).toBeTruthy();
    expect(replacedReview.snapshot?.files?.[0]?.publicId).toBe(first.files[0].publicId);
  });
});

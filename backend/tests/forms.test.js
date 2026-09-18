const { setupDb, teardownDb, login, createMember } = require("./helpers");
const env = require("../src/config/env");
const { createField, createSection, createOption } = require("../../shared/form-engine");

beforeAll(setupDb);
afterAll(teardownDb);

function csrf(req) {
  return req.set("Origin", "http://localhost:3000").set("X-Requested-With", "XMLHttpRequest");
}

describe("forms module", () => {
  it("blocks members from listing forms", async () => {
    await createMember({ email: "forms-member@example.com" });
    const { agent } = await login("forms-member@example.com", "Password123");
    const res = await csrf(agent.get("/api/v1/forms"));
    expect(res.status).toBe(403);
  });

  it("creates a draft, rejects invalid publish, publishes, clones a new draft, and submits the published version", async () => {
    const { agent } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);

    const created = await csrf(agent.post("/api/v1/forms")).send({
      name: "Supplier Onboarding",
      description: "Manufacturer intake",
      template: "supplier_onboarding",
    });
    expect(created.status).toBe(201);
    const formId = created.body.data.form.id;
    expect(created.body.data.form.draft.status).toBe("draft");
    expect(created.body.data.form.draft.fields.length).toBeGreaterThan(3);

    const section = createSection({ title: "Broken" });
    const fieldA = createField("text", { key: "company_name", label: "Company", sectionId: section.id });
    const fieldB = createField("text", { key: "company_name", label: "Also company", sectionId: section.id });
    const dropdown = createField("dropdown", { key: "kind", label: "Kind", sectionId: section.id, options: [createOption("One")] });
    const invalid = await csrf(agent.patch(`/api/v1/forms/${formId}/draft`)).send({
      sections: [section],
      fields: [fieldA, fieldB, dropdown],
      rules: [],
    });
    expect(invalid.status).toBe(200);

    const blocked = await csrf(agent.post(`/api/v1/forms/${formId}/publish`)).send({});
    expect(blocked.status).toBe(422);

    const restored = await csrf(agent.patch(`/api/v1/forms/${formId}/draft`)).send({
      name: "Supplier Onboarding",
      description: "Manufacturer intake",
      sections: created.body.data.form.draft.sections,
      fields: created.body.data.form.draft.fields,
      rules: created.body.data.form.draft.rules,
      documents: created.body.data.form.draft.documents,
      stages: created.body.data.form.draft.stages,
    });
    expect(restored.status).toBe(200);

    const published = await csrf(agent.post(`/api/v1/forms/${formId}/publish`)).send({});
    expect(published.status).toBe(200);
    expect(published.body.data.form.status).toBe("published");
    expect(published.body.data.form.published.status).toBe("published");
    expect(published.body.data.form.draft).toBeNull();
    const publishedVersionId = published.body.data.form.published.id;

    const locked = await csrf(agent.patch(`/api/v1/forms/${formId}/draft`)).send({
      fields: created.body.data.form.draft.fields,
    });
    expect(locked.status).toBe(200);
    expect(locked.body.data.form.draft.version).toBe("1.1");
    expect(locked.body.data.form.published.id).toBe(publishedVersionId);

    const submitInvalid = await csrf(agent.post(`/api/v1/forms/${formId}/submissions`)).send({
      values: { company_name: "", country: "India" },
    });
    expect(submitInvalid.status).toBe(422);

    const submit = await csrf(agent.post(`/api/v1/forms/${formId}/submissions`)).send({
      values: {
        company_name: "Acme Manufacturing",
        supplier_type: "manufacturer",
        country: "India",
        annual_turnover: 150000000,
        gst_number: "22AAAAA0000A1Z5",
      },
    });
    expect(submit.status).toBe(201);
    expect(submit.body.data.submission.versionId).toBe(publishedVersionId);
    expect(submit.body.data.submission.derivedState.fields.gst_number.required).toBe(true);

    const test = await csrf(agent.post(`/api/v1/forms/${formId}/rules/test`)).send({
      ruleId: created.body.data.form.draft.rules[0].id,
      values: { country: "India", supplier_type: "manufacturer", annual_turnover: 50000000 },
      versionId: publishedVersionId,
    });
    expect(test.status).toBe(200);
    expect(test.body.data.result.matched).toBe(false);
  });
});

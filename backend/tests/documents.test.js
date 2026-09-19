const { setupDb, teardownDb, login, createMember } = require("./helpers");
const env = require("../src/config/env");
const { seedDocumentTemplates } = require("../src/seeds/documents");
const User = require("../src/models/User");

beforeAll(setupDb);
afterAll(teardownDb);

function csrf(req) {
  return req.set("Origin", "http://localhost:3000").set("X-Requested-With", "XMLHttpRequest");
}

describe("documents", () => {
  it("blocks members from viewing documents", async () => {
    await createMember({ email: "docs-member@example.com" });
    const { agent } = await login("docs-member@example.com", "Password123");
    const res = await csrf(agent.get("/api/v1/documents"));
    expect(res.status).toBe(403);
  });

  it("creates a template, publishes it, generates, saves, issues, and files a document", async () => {
    const { agent } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);
    const admin = await User.findOne({ email: env.SUPERADMIN_EMAIL });
    await seedDocumentTemplates(admin);

    const catalog = await csrf(agent.get("/api/v1/documents/variables")).query({ subjectType: "lead" });
    expect(catalog.status).toBe(200);
    expect(catalog.body.data.items.some((item) => item.path === "supplier.gstin")).toBe(true);

    const templates = await csrf(agent.get("/api/v1/documents/templates")).query({ status: "published" });
    expect(templates.status).toBe(200);
    const noc = templates.body.data.items.find((item) => item.slug === "supplier-noc");
    expect(noc).toBeTruthy();

    const created = await csrf(agent.post("/api/v1/documents/templates")).send({
      name: "Custom letter",
      type: "letter",
      subjectTypes: ["lead"],
      content: [
        {
          id: "p1",
          type: "paragraph",
          props: { textColor: "default", backgroundColor: "default", textAlignment: "left" },
          content: [{ type: "variable", props: { path: "supplier.name", label: "Supplier name", value: "", missing: false } }],
          children: [],
        },
      ],
    });
    expect(created.status).toBe(201);
    const templateId = created.body.data.template.id;
    const published = await csrf(agent.post(`/api/v1/documents/templates/${templateId}/publish`)).send({});
    expect(published.status).toBe(200);
    expect(published.body.data.template.status).toBe("published");

    const lead = await csrf(agent.post("/api/v1/leads")).send({
      name: "Pune Frozen Foods",
      legalName: "Pune Frozen Foods Pvt Ltd",
      country: "India",
      city: "Pune",
      gstin: "27AAAAA0000A1Z5",
    });
    expect(lead.status).toBe(201);
    const leadId = lead.body.data.lead.id;

    const preview = await csrf(agent.post("/api/v1/documents/preview-bindings")).send({
      templateId,
      subjectType: "lead",
      subjectId: leadId,
    });
    expect(preview.status).toBe(200);
    expect(preview.body.data.bindings.values["supplier.name"]).toBe("Pune Frozen Foods");

    const generated = await csrf(agent.post("/api/v1/documents")).send({
      templateId,
      subjectType: "lead",
      subjectId: leadId,
    });
    expect(generated.status).toBe(201);
    const documentId = generated.body.data.document.id;
    expect(generated.body.data.document.docNumber).toMatch(/^LTR-/);
    expect(generated.body.data.document.content[0].content[0].props.value).toBe("Pune Frozen Foods");

    const saved = await csrf(agent.patch(`/api/v1/documents/${documentId}`)).send({
      title: "Welcome letter",
      content: generated.body.data.document.content,
    });
    expect(saved.status).toBe(200);
    expect(saved.body.data.document.title).toBe("Welcome letter");

    const issued = await csrf(agent.post(`/api/v1/documents/${documentId}/issue`)).send({});
    expect(issued.status).toBe(200);
    expect(issued.body.data.document.status).toBe("issued");
    expect(issued.body.data.document.pdf).toBeTruthy();

    const packet = await csrf(agent.post(`/api/v1/documents/${documentId}/packet`)).send({});
    expect(packet.status).toBe(200);
    expect(packet.body.data.document.status).toBe("filed");

    const pdfFile = await csrf(agent.get(`/api/v1/documents/${documentId}/files/pdf`));
    expect(pdfFile.status).toBe(200);
    expect(String(pdfFile.headers["content-type"])).toMatch(/pdf/);
    expect(String(pdfFile.headers["content-disposition"])).toMatch(/attachment/);

    const packetFile = await csrf(agent.get(`/api/v1/documents/${documentId}/files/packet`));
    expect(packetFile.status).toBe(200);
    expect(String(packetFile.headers["content-type"])).toMatch(/pdf/);
  });
});

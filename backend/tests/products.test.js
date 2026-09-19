const { setupDb, teardownDb, login, createMember, createUserWithRole } = require("./helpers");
const env = require("../src/config/env");
const Lead = require("../src/models/Lead");
const Product = require("../src/models/Product");
const ExportBuyer = require("../src/models/ExportBuyer");
const Role = require("../src/models/Role");
const {
  PRODUCTS_PERMISSION_NAMES,
  SALES_PRODUCTS_PERMISSIONS,
  COMPLIANCE_PRODUCTS_PERMISSIONS,
  EXPORT_MANAGER_PRODUCTS_PERMISSIONS,
  FINANCE_PRODUCTS_PERMISSIONS,
} = require("../src/constants/products");

beforeAll(setupDb);
afterAll(teardownDb);

function csrf(req) {
  return req.set("Origin", "http://localhost:3000").set("X-Requested-With", "XMLHttpRequest");
}

function sampleFile(name = "spec.pdf") {
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

describe("product catalog", () => {
  it("blocks members from listing products", async () => {
    await createMember({ email: "product-member@example.com" });
    const { agent } = await login("product-member@example.com", "Password123");
    const res = await csrf(agent.get("/api/v1/products"));
    expect(res.status).toBe(403);
  });

  it("creates a product for a verified supplier, verifies it, lists it, and shares it", async () => {
    const { agent } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);

    const unverified = await Lead.create({
      name: "Unverified Mill",
      stage: "won",
      verificationStatus: "pending",
      wonAt: new Date(),
    });
    const blocked = await csrf(agent.post("/api/v1/products")).send({
      name: "Blocked SKU",
      supplierId: String(unverified._id),
    });
    expect(blocked.status).toBeGreaterThanOrEqual(400);

    const supplier = await Lead.create({
      name: "Verified Mill",
      stage: "won",
      verificationStatus: "verified",
      wonAt: new Date(),
    });

    const created = await csrf(agent.post("/api/v1/products")).send({
      name: "Organic Turmeric",
      sku: `TUR-${Date.now()}`,
      category: "Spices",
      supplierId: String(supplier._id),
      measurements: [{ name: "Net weight", dimension: "weight", value: 25, unit: "kg" }],
      media: [],
    });
    expect(created.status).toBe(201);
    const productId = created.body.data.product.id;
    expect(created.body.data.product.status).toBe("draft");
    expect(created.body.data.product.listingStatus).toBe("unlisted");

    const prematureList = await csrf(agent.post(`/api/v1/products/${productId}/list`)).send({});
    expect(prematureList.status).toBeGreaterThanOrEqual(400);

    const form = await csrf(agent.post("/api/v1/forms")).send({
      name: "Product compliance pack",
      template: "product_compliance",
      purpose: "product_verification",
    });
    expect(form.status).toBe(201);
    expect(form.body.data.form.purpose).toBe("product_verification");
    const formId = form.body.data.form.id;
    const published = await csrf(agent.post(`/api/v1/forms/${formId}/publish`)).send({});
    expect(published.status).toBe(200);

    const assigned = await csrf(agent.post("/api/v1/verification")).send({
      productId,
      formId,
    });
    expect(assigned.status).toBe(201);
    expect(assigned.body.data.case.subjectType).toBe("product");
    const caseId = assigned.body.data.case.id;
    const documents = assigned.body.data.case.documents || [];
    expect(documents.length).toBeGreaterThan(0);

    const values = {
      product_name: "Organic Turmeric",
      intended_use: "Food ingredient",
      origin_country: "India",
    };
    for (const doc of documents.filter((item) => item.required)) {
      const saved = await csrf(agent.patch(`/api/v1/verification/documents/${doc.id}`)).send({
        issuedAt: new Date().toISOString().slice(0, 10),
        expiresAt: nextYear(),
        issuer: "Manufacturer",
        files: [sampleFile(`${doc.documentKey}.pdf`)],
      });
      expect(saved.status).toBe(200);
    }

    const submitted = await csrf(agent.post(`/api/v1/verification/${caseId}/submit`)).send({ values });
    expect(submitted.status).toBe(200);

    const refreshed = await csrf(agent.get(`/api/v1/verification/${caseId}`));
    for (const doc of (refreshed.body.data.case.documents || []).filter((item) => item.required)) {
      const reviewed = await csrf(agent.post(`/api/v1/verification/documents/${doc.id}/review`)).send({
        decision: "verified",
        note: "Looks good",
      });
      expect(reviewed.status).toBe(200);
    }

    const approved = await csrf(agent.post(`/api/v1/verification/${caseId}/review`)).send({
      decision: "verified",
      note: "Approved",
    });
    expect(approved.status).toBe(200);

    const listed = await csrf(agent.post(`/api/v1/products/${productId}/list`)).send({});
    expect(listed.status).toBe(200);
    expect(listed.body.data.product.listingStatus).toBe("listed");

    const buyer = await ExportBuyer.create({ name: "Gulf Foods LLC", status: "active" });
    const shared = await csrf(agent.post(`/api/v1/products/${productId}/shares`)).send({
      buyerId: String(buyer._id),
      note: "For UAE listing",
    });
    expect(shared.status).toBe(201);

    const shares = await csrf(agent.get(`/api/v1/products/shares?buyerId=${buyer._id}`));
    expect(shares.status).toBe(200);
    expect(shares.body.data.items.length).toBe(1);
  });
});

function expectAllowed(res) {
  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.status).toBeLessThan(300);
}

function expectForbidden(res) {
  expect(res.status).toBe(403);
  expect(res.body.error.code).toBe("FORBIDDEN");
}

async function rolePermissions(slug) {
  const role = await Role.findOne({ slug }).populate("permissionIds");
  return (role?.permissionIds || []).map((item) => item.name);
}

async function loginRole(email) {
  const { agent, res } = await login(email, "Password123");
  expect(res.status).toBe(200);
  return { agent, user: res.body.data.user };
}

describe("product catalog role access", () => {
  const password = "Password123";
  let supplier;
  let draftProduct;
  let listedProduct;
  let readyToList;
  let deleteTarget;
  let archiveTarget;
  let buyerA;
  let buyerB;
  let formId;

  beforeAll(async () => {
    await Promise.all([
      createUserWithRole("sales", { email: "access-sales@example.com", name: "Access Sales", password }),
      createUserWithRole("compliance-manager", { email: "access-compliance@example.com", name: "Access Compliance", password }),
      createUserWithRole("export-manager", { email: "access-export@example.com", name: "Access Export", password }),
      createUserWithRole("finance", { email: "access-finance@example.com", name: "Access Finance", password }),
      createUserWithRole("admin", { email: "access-admin@example.com", name: "Access Admin", password }),
      createUserWithRole("logistics-manager", { email: "access-logistics@example.com", name: "Access Logistics", password }),
      createMember({ email: "access-member@example.com", name: "Access Member", password }),
    ]);

    supplier = await Lead.create({
      name: "Access Verified Mill",
      stage: "won",
      verificationStatus: "verified",
      wonAt: new Date(),
    });
    const base = {
      supplierId: supplier._id,
      category: "Spices",
      indicativePrice: 42,
      currency: "USD",
      origin: "catalog",
    };
    draftProduct = await Product.create({
      ...base,
      name: "Access Draft Pepper",
      sku: `ACC-DRAFT-${Date.now()}`,
      status: "draft",
      listingStatus: "unlisted",
      verificationStatus: "none",
    });
    listedProduct = await Product.create({
      ...base,
      name: "Access Listed Cardamom",
      sku: `ACC-LIST-${Date.now()}`,
      status: "verified",
      listingStatus: "listed",
      verificationStatus: "verified",
      listedAt: new Date(),
    });
    readyToList = await Product.create({
      ...base,
      name: "Access Ready Clove",
      sku: `ACC-READY-${Date.now()}`,
      status: "verified",
      listingStatus: "unlisted",
      verificationStatus: "verified",
    });
    deleteTarget = await Product.create({
      ...base,
      name: "Access Delete Me",
      sku: `ACC-DEL-${Date.now()}`,
      status: "draft",
      listingStatus: "unlisted",
      verificationStatus: "none",
    });
    archiveTarget = await Product.create({
      ...base,
      name: "Access Archive Me",
      sku: `ACC-ARC-${Date.now()}`,
      status: "draft",
      listingStatus: "unlisted",
      verificationStatus: "none",
    });
    buyerA = await ExportBuyer.create({ name: "Access Buyer A", status: "active" });
    buyerB = await ExportBuyer.create({ name: "Access Buyer B", status: "active" });

    const { agent } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);
    const form = await csrf(agent.post("/api/v1/forms")).send({
      name: "Access product pack",
      template: "product_compliance",
      purpose: "product_verification",
    });
    expect(form.status).toBe(201);
    formId = form.body.data.form.id;
    const published = await csrf(agent.post(`/api/v1/forms/${formId}/publish`)).send({});
    expect(published.status).toBe(200);
  });

  it("seeds the catalog permission bundles onto system roles", async () => {
    const sales = await rolePermissions("sales");
    const compliance = await rolePermissions("compliance-manager");
    const exportManager = await rolePermissions("export-manager");
    const finance = await rolePermissions("finance");
    const logistics = await rolePermissions("logistics-manager");
    const member = await rolePermissions("member");
    const admin = await rolePermissions("admin");

    expect(sales).toEqual(expect.arrayContaining(SALES_PRODUCTS_PERMISSIONS));
    expect(sales).not.toEqual(expect.arrayContaining(["products.list", "products.delete"]));
    expect(sales).toEqual(expect.arrayContaining(["verification.view", "verification.submit"]));
    expect(sales).not.toContain("verification.assign");
    expect(sales).not.toContain("verification.review");
    expect(sales).not.toContain("export.finance.view");
    expect(sales).not.toContain("export.buyers.view");

    expect(compliance).toEqual(expect.arrayContaining(COMPLIANCE_PRODUCTS_PERMISSIONS));
    expect(compliance).not.toEqual(expect.arrayContaining(["products.create", "products.update", "products.share"]));
    expect(compliance).toEqual(expect.arrayContaining(["verification.view", "verification.assign", "verification.review"]));

    expect(exportManager).toEqual(expect.arrayContaining(EXPORT_MANAGER_PRODUCTS_PERMISSIONS));
    expect(exportManager).not.toEqual(expect.arrayContaining(["products.create", "products.update", "products.list", "products.delete"]));
    expect(exportManager).toContain("export.buyers.view");

    expect(finance).toEqual(expect.arrayContaining(FINANCE_PRODUCTS_PERMISSIONS));
    expect(finance.filter((name) => name.startsWith("products."))).toEqual(["products.view"]);
    expect(finance).toContain("export.finance.view");

    expect(logistics.some((name) => name.startsWith("products."))).toBe(false);
    expect(member.some((name) => name.startsWith("products."))).toBe(false);
    expect(admin).toEqual(expect.arrayContaining(PRODUCTS_PERMISSION_NAMES));
  });

  it("returns the seeded permissions on login for each catalog role", async () => {
    const cases = [
      { email: "access-sales@example.com", allow: SALES_PRODUCTS_PERMISSIONS, deny: ["products.list", "products.delete"] },
      { email: "access-compliance@example.com", allow: COMPLIANCE_PRODUCTS_PERMISSIONS, deny: ["products.create", "products.share"] },
      { email: "access-export@example.com", allow: EXPORT_MANAGER_PRODUCTS_PERMISSIONS, deny: ["products.create", "products.list"] },
      { email: "access-finance@example.com", allow: FINANCE_PRODUCTS_PERMISSIONS, deny: ["products.create", "products.update", "products.list", "products.share"] },
      { email: "access-admin@example.com", allow: PRODUCTS_PERMISSION_NAMES, deny: [] },
      { email: "access-member@example.com", allow: [], deny: PRODUCTS_PERMISSION_NAMES },
      { email: "access-logistics@example.com", allow: [], deny: PRODUCTS_PERMISSION_NAMES },
    ];
    for (const item of cases) {
      const { user } = await loginRole(item.email);
      expect(user.permissions).toEqual(expect.arrayContaining(item.allow));
      for (const name of item.deny) {
        expect(user.permissions).not.toContain(name);
      }
    }
  });

  it("allows sales to create, update, and share, but not list or delete", async () => {
    const { agent } = await loginRole("access-sales@example.com");

    const list = await csrf(agent.get("/api/v1/products"));
    expectAllowed(list);
    const priced = list.body.data.items.find((item) => item.id === String(listedProduct._id));
    expect(priced).toBeTruthy();
    expect(priced.indicativePrice).toBeUndefined();
    expect(priced.baseCost).toBeUndefined();

    const created = await csrf(agent.post("/api/v1/products")).send({
      name: "Sales Created Cumin",
      sku: `ACC-SALES-${Date.now()}`,
      supplierId: String(supplier._id),
    });
    expect(created.status).toBe(201);

    const updated = await csrf(agent.patch(`/api/v1/products/${draftProduct._id}`)).send({ brand: "Sales Brand" });
    expectAllowed(updated);
    expect(updated.body.data.product.brand).toBe("Sales Brand");

    const listed = await csrf(agent.post(`/api/v1/products/${readyToList._id}/list`)).send({});
    expectForbidden(listed);

    const removed = await csrf(agent.delete(`/api/v1/products/${deleteTarget._id}`));
    expectForbidden(removed);

    const shared = await csrf(agent.post(`/api/v1/products/${listedProduct._id}/shares`)).send({
      buyerId: String(buyerA._id),
      note: "Sales share",
    });
    expect(shared.status).toBe(201);

    const buyers = await csrf(agent.get("/api/v1/export/buyers"));
    expectForbidden(buyers);
    const distributors = await csrf(agent.get("/api/v1/products/distributors"));
    expectAllowed(distributors);
    expect(distributors.body.data.items.length).toBeGreaterThan(0);

    const assigned = await csrf(agent.post("/api/v1/verification")).send({
      productId: String(created.body.data.product.id),
      formId,
    });
    expect(assigned.status).toBe(201);
    expect(assigned.body.data.case.subjectType).toBe("product");

    const supplierCase = await csrf(agent.post("/api/v1/verification")).send({
      leadId: String(supplier._id),
      formId,
    });
    expectForbidden(supplierCase);

    const reviewed = await csrf(agent.post(`/api/v1/verification/${listedProduct._id}/review`)).send({
      decision: "verified",
    });
    expect(reviewed.status).toBe(403);
  });

  it("allows compliance to view, list, delete, and review, but not create or share", async () => {
    const { agent } = await loginRole("access-compliance@example.com");

    const list = await csrf(agent.get("/api/v1/products"));
    expectAllowed(list);

    const created = await csrf(agent.post("/api/v1/products")).send({
      name: "Compliance should not create",
      supplierId: String(supplier._id),
    });
    expectForbidden(created);

    const updated = await csrf(agent.patch(`/api/v1/products/${draftProduct._id}`)).send({ brand: "Blocked" });
    expectForbidden(updated);

    const listed = await csrf(agent.post(`/api/v1/products/${readyToList._id}/list`)).send({});
    expectAllowed(listed);
    expect(listed.body.data.product.listingStatus).toBe("listed");

    const shared = await csrf(agent.post(`/api/v1/products/${listedProduct._id}/shares`)).send({
      buyerId: String(buyerB._id),
    });
    expectForbidden(shared);

    const assigned = await csrf(agent.post("/api/v1/verification")).send({
      productId: String(draftProduct._id),
      formId,
    });
    expect(assigned.status).toBe(201);
    expect(assigned.body.data.case.subjectType).toBe("product");

    const removed = await csrf(agent.delete(`/api/v1/products/${deleteTarget._id}`));
    expectAllowed(removed);
  });

  it("allows export managers to view and share listed products, but not mutate the catalog", async () => {
    const { agent } = await loginRole("access-export@example.com");

    const list = await csrf(agent.get("/api/v1/products"));
    expectAllowed(list);
    const priced = list.body.data.items.find((item) => item.id === String(listedProduct._id));
    expect(priced.indicativePrice).toBe(42);

    const created = await csrf(agent.post("/api/v1/products")).send({
      name: "Export should not create",
      supplierId: String(supplier._id),
    });
    expectForbidden(created);

    const updated = await csrf(agent.patch(`/api/v1/products/${draftProduct._id}`)).send({ brand: "Export" });
    expectForbidden(updated);

    const unlist = await csrf(agent.post(`/api/v1/products/${listedProduct._id}/unlist`)).send({});
    expectForbidden(unlist);

    const shared = await csrf(agent.post(`/api/v1/products/${listedProduct._id}/shares`)).send({
      buyerId: String(buyerB._id),
      note: "Export share",
    });
    expect(shared.status).toBe(201);
  });

  it("allows finance to view prices and blocks catalog writes", async () => {
    const { agent } = await loginRole("access-finance@example.com");

    const detail = await csrf(agent.get(`/api/v1/products/${listedProduct._id}`));
    expectAllowed(detail);
    expect(detail.body.data.product.indicativePrice).toBe(42);
    expect(detail.body.data.product.currency).toBe("USD");

    expectForbidden(await csrf(agent.post("/api/v1/products")).send({ name: "No", supplierId: String(supplier._id) }));
    expectForbidden(await csrf(agent.patch(`/api/v1/products/${draftProduct._id}`)).send({ brand: "No" }));
    expectForbidden(await csrf(agent.post(`/api/v1/products/${listedProduct._id}/list`)).send({}));
    expectForbidden(await csrf(agent.post(`/api/v1/products/${listedProduct._id}/shares`)).send({ buyerId: String(buyerA._id) }));
    expectForbidden(await csrf(agent.get("/api/v1/products/distributors")));
    expectForbidden(await csrf(agent.delete(`/api/v1/products/${draftProduct._id}`)));
  });

  it("blocks members and logistics managers from the catalog", async () => {
    for (const email of ["access-member@example.com", "access-logistics@example.com"]) {
      const { agent } = await loginRole(email);
      expectForbidden(await csrf(agent.get("/api/v1/products")));
      expectForbidden(await csrf(agent.get(`/api/v1/products/${listedProduct._id}`)));
      expectForbidden(await csrf(agent.post("/api/v1/products")).send({ name: "No", supplierId: String(supplier._id) }));
    }
  });

  it("lets admin perform catalog writes that other roles cannot", async () => {
    const { agent } = await loginRole("access-admin@example.com");

    const created = await csrf(agent.post("/api/v1/products")).send({
      name: "Admin Created Fennel",
      sku: `ACC-ADMIN-${Date.now()}`,
      supplierId: String(supplier._id),
    });
    expect(created.status).toBe(201);

    const archived = await csrf(agent.post(`/api/v1/products/${archiveTarget._id}/archive`)).send({});
    expectAllowed(archived);
    expect(archived.body.data.product.status).toBe("archived");

    const unlisted = await csrf(agent.post(`/api/v1/products/${listedProduct._id}/unlist`)).send({});
    expectAllowed(unlisted);
    expect(unlisted.body.data.product.listingStatus).toBe("unlisted");
  });
});

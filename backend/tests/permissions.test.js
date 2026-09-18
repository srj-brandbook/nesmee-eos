const { setupDb, teardownDb, login, createMember } = require("./helpers");
const env = require("../src/config/env");

beforeAll(setupDb);
afterAll(teardownDb);

describe("authorization", () => {
  it("blocks members from listing users", async () => {
    await createMember();
    const { agent } = await login("member@example.com", "Password123");
    const res = await agent
      .get("/api/v1/users")
      .set("Origin", "http://localhost:3000")
      .set("X-Requested-With", "XMLHttpRequest");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("allows super admin to list users", async () => {
    const { agent } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);
    const res = await agent
      .get("/api/v1/users")
      .set("Origin", "http://localhost:3000")
      .set("X-Requested-With", "XMLHttpRequest");
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });
});

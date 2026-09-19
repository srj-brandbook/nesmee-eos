const { setupDb, teardownDb, login, createMember, api } = require("./helpers");
const env = require("../src/config/env");
const Notification = require("../src/models/Notification");

beforeAll(setupDb);
afterAll(teardownDb);

function csrf(req) {
  return req.set("Origin", "http://localhost:3000").set("X-Requested-With", "XMLHttpRequest");
}

describe("home dashboard", () => {
  it("rejects unauthenticated access", async () => {
    const res = await api().get("/api/v1/dashboard");
    expect(res.status).toBe(401);
  });

  it("returns live workspace KPIs for a member without domain sections", async () => {
    const member = await createMember({ email: "dashboard-member@example.com" });
    await Notification.create({
      userId: member._id,
      type: "system",
      title: "Welcome",
      body: "Your account is ready",
    });
    const { agent } = await login("dashboard-member@example.com", "Password123");
    const res = await csrf(agent.get("/api/v1/dashboard"));
    expect(res.status).toBe(200);
    expect(res.body.data.workspace.unread).toBe(1);
    expect(res.body.data.sourcing).toBeNull();
    expect(res.body.data.export).toBeNull();
    expect(res.body.data.billing).toBeNull();
    expect(res.body.data.kpis.some((item) => item.key === "unread" && item.value === 1)).toBe(true);
    expect(res.body.data.activityTrend).toHaveLength(7);
  });

  it("aggregates live sourcing KPIs after a lead is created", async () => {
    const { agent } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);
    const lead = await csrf(agent.post("/api/v1/leads")).send({
      name: "Dashboard Mill",
      country: "India",
    });
    expect(lead.status).toBe(201);

    const res = await csrf(agent.get("/api/v1/dashboard"));
    expect(res.status).toBe(200);
    expect(res.body.data.emailVerificationRequired).toBe(false);
    expect(res.body.data.sourcing.inProcess).toBeGreaterThanOrEqual(1);
    expect(res.body.data.kpis.some((item) => item.key === "inProcess" && item.value >= 1)).toBe(true);
    expect(res.body.data.activityTrend.reduce((sum, point) => sum + point.value, 0)).toBeGreaterThanOrEqual(1);
    expect(res.body.data.workspace.unread).toBeGreaterThanOrEqual(0);
  });
});

const { setupDb, teardownDb, api, login, createMember } = require("./helpers");
const env = require("../src/config/env");
const EmailVerificationToken = require("../src/models/EmailVerificationToken");
const { randomToken, hashToken } = require("../src/utils/hash");
const { addHours } = require("../src/utils/tokens");
const User = require("../src/models/User");
const Session = require("../src/models/Session");

beforeAll(setupDb);
afterAll(teardownDb);

function csrf(req) {
  return req.set("Origin", "http://localhost:3000").set("X-Requested-With", "XMLHttpRequest");
}

async function latestSession(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  return Session.findOne({ userId: user._id }).sort({ createdAt: -1 });
}

describe("auth", () => {
  it("signs up and rejects duplicate email", async () => {
    const first = await api().post("/api/v1/auth/signup").send({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "Password123",
    });
    expect(first.status).toBe(201);
    expect(first.body.data.user.email).toBe("ada@example.com");

    const dup = await api().post("/api/v1/auth/signup").send({
      name: "Ada",
      email: "ada@example.com",
      password: "Password123",
    });
    expect(dup.status).toBe(409);
  });

  it("logs in super admin and returns permissions", async () => {
    const { res } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body.data.user.permissions.length).toBeGreaterThan(0);
    expect(res.headers["set-cookie"].some((cookie) => cookie.startsWith("sid="))).toBe(true);
    expect(res.headers["set-cookie"].some((cookie) => cookie.startsWith("rid="))).toBe(true);
  });

  it("rejects invalid login", async () => {
    const res = await api().post("/api/v1/auth/login").send({
      email: env.SUPERADMIN_EMAIL,
      password: "wrong-password",
    });
    expect(res.status).toBe(401);
  });

  it("returns current user with cookie", async () => {
    const { agent, res } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);
    expect(res.status).toBe(200);
    const me = await agent
      .get("/api/v1/auth/me")
      .set("Origin", "http://localhost:3000")
      .set("X-Requested-With", "XMLHttpRequest");
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(env.SUPERADMIN_EMAIL.toLowerCase());
  });

  it("verifies email token", async () => {
    const member = await createMember({ email: "verify@example.com" });
    member.status = "pending_verification";
    member.emailVerifiedAt = null;
    await member.save();
    const raw = randomToken();
    await EmailVerificationToken.create({
      userId: member._id,
      tokenHash: hashToken(raw),
      expiresAt: addHours(new Date(), 1),
    });
    const res = await api().post("/api/v1/auth/verify-email").send({ token: raw });
    expect(res.status).toBe(200);
    const fresh = await User.findById(member._id);
    expect(fresh.status).toBe("active");
  });

  it("issues new cookies when access expired and refresh token is valid", async () => {
    const { agent } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);
    const session = await latestSession(env.SUPERADMIN_EMAIL);
    session.accessExpiresAt = new Date(Date.now() - 1000);
    await session.save();

    const expired = await csrf(agent.get("/api/v1/auth/me"));
    expect(expired.status).toBe(401);

    const refresh = await csrf(agent.post("/api/v1/auth/refresh"));
    expect(refresh.status).toBe(200);
    expect(refresh.body.data.user.email).toBe(env.SUPERADMIN_EMAIL.toLowerCase());
    expect(refresh.headers["set-cookie"].some((cookie) => cookie.startsWith("sid="))).toBe(true);
    expect(refresh.headers["set-cookie"].some((cookie) => cookie.startsWith("rid="))).toBe(true);

    const me = await csrf(agent.get("/api/v1/auth/me"));
    expect(me.status).toBe(200);
  });

  it("rejects refresh and clears cookies when the refresh token is expired", async () => {
    const { agent } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);
    const session = await latestSession(env.SUPERADMIN_EMAIL);
    session.expiresAt = new Date(Date.now() - 1000);
    await session.save();

    const refresh = await csrf(agent.post("/api/v1/auth/refresh"));
    expect(refresh.status).toBe(401);
    const cookies = refresh.headers["set-cookie"] || [];
    const cleared = (name) =>
      cookies.some(
        (cookie) =>
          cookie.startsWith(`${name}=`) && (/Max-Age=0/i.test(cookie) || /Expires=Thu, 01 Jan 1970/i.test(cookie) || cookie.startsWith(`${name}=;`))
      );
    expect(cleared("sid")).toBe(true);
    expect(cleared("rid")).toBe(true);
  });

  it("rejects refresh when the session is idle", async () => {
    const { agent } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);
    const session = await latestSession(env.SUPERADMIN_EMAIL);
    session.lastSeenAt = new Date(Date.now() - (env.IDLE_TTL_HOURS + 1) * 60 * 60 * 1000);
    await session.save();

    const refresh = await csrf(agent.post("/api/v1/auth/refresh"));
    expect(refresh.status).toBe(401);
  });
});

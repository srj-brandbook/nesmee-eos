const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const request = require("supertest");
const { createApp } = require("../src/app");
const { seedPermissions } = require("../src/seeds/permissions");
const { seedRoles } = require("../src/seeds/roles");
const { seedSuperAdmin } = require("../src/seeds/superAdmin");
const User = require("../src/models/User");
const Role = require("../src/models/Role");
const { hashPassword } = require("../src/utils/hash");

jest.mock("../src/utils/mailer", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({}),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({}),
  sendMail: jest.fn().mockResolvedValue({}),
}));

let memory;

async function setupDb() {
  memory = await MongoMemoryServer.create({
    instance: { launchTimeout: 60000 },
    spawn: { timeout: 60000 },
  });
  await mongoose.connect(memory.getUri());
  const permissions = await seedPermissions();
  const roles = await seedRoles(permissions);
  await seedSuperAdmin(roles.find((role) => role.isSuperAdmin));
}

async function teardownDb() {
  await mongoose.disconnect();
  if (memory) await memory.stop();
}

function app() {
  return createApp();
}

function withCsrf(req) {
  return req.set("Origin", "http://localhost:3000").set("X-Requested-With", "XMLHttpRequest");
}

function api() {
  const client = request(app());
  return {
    get: (url) => withCsrf(client.get(url)),
    post: (url) => withCsrf(client.post(url)),
    patch: (url) => withCsrf(client.patch(url)),
    put: (url) => withCsrf(client.put(url)),
    delete: (url) => withCsrf(client.delete(url)),
  };
}

async function login(email, password) {
  const agent = request.agent(app());
  const res = await agent
    .post("/api/v1/auth/login")
    .set("Origin", "http://localhost:3000")
    .set("X-Requested-With", "XMLHttpRequest")
    .send({ email, password });
  return { agent, res };
}

async function createUserWithRole(slug, overrides = {}) {
  const role = await Role.findOne({ slug });
  return User.create({
    name: overrides.name || `${slug} user`,
    email: overrides.email || `${slug}@example.com`,
    passwordHash: await hashPassword(overrides.password || "Password123"),
    status: "active",
    emailVerifiedAt: new Date(),
    roleIds: [role._id],
  });
}

async function createMember(overrides = {}) {
  return createUserWithRole("member", { name: "Member User", email: "member@example.com", ...overrides });
}

module.exports = { setupDb, teardownDb, app, api, login, createMember, createUserWithRole };

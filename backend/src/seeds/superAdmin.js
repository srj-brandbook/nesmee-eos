const User = require("../models/User");
const Settings = require("../models/Settings");
const env = require("../config/env");
const { hashPassword } = require("../utils/hash");

async function seedSuperAdmin(superAdminRole) {
  await Settings.findOneAndUpdate(
    { key: "app" },
    { $setOnInsert: { key: "app", name: "SaaS Boilerplate", supportEmail: env.SUPERADMIN_EMAIL } },
    { upsert: true }
  );

  const existing = await User.findOne({ email: env.SUPERADMIN_EMAIL.toLowerCase(), deletedAt: null });
  if (existing) {
    existing.roleIds = [superAdminRole._id];
    existing.status = "active";
    existing.emailVerifiedAt = existing.emailVerifiedAt || new Date();
    await existing.save();
    return existing;
  }

  return User.create({
    name: env.SUPERADMIN_NAME,
    email: env.SUPERADMIN_EMAIL.toLowerCase(),
    passwordHash: await hashPassword(env.SUPERADMIN_PASSWORD),
    status: "active",
    roleIds: [superAdminRole._id],
    emailVerifiedAt: new Date(),
  });
}

module.exports = { seedSuperAdmin };

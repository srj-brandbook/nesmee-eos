const Settings = require("../../models/Settings");
const auditService = require("../audit/audit.service");

async function get() {
  const settings = await Settings.findOneAndUpdate(
    { key: "app" },
    { $setOnInsert: { key: "app" } },
    { upsert: true, new: true }
  ).lean();
  return {
    name: settings.name,
    supportEmail: settings.supportEmail,
    signupEnabled: settings.signupEnabled,
    maintenanceMode: settings.maintenanceMode,
    updatedAt: settings.updatedAt,
  };
}

async function update(payload, actor, req) {
  const settings = await Settings.findOneAndUpdate(
    { key: "app" },
    { $set: payload, $setOnInsert: { key: "app" } },
    { upsert: true, new: true }
  ).lean();
  await auditService.log({
    actor,
    action: "update",
    module: "settings",
    resourceType: "Settings",
    resourceId: settings._id,
    req,
    metadata: payload,
  });
  return get();
}

module.exports = { get, update };

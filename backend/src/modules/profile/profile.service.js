const User = require("../../models/User");
const { serializeUser } = require("../../utils/userSerializer");
const auditService = require("../audit/audit.service");
const uploadService = require("../uploads/upload.service");

async function get(user) {
  const fresh = await User.findById(user._id).populate("roleIds").lean();
  return serializeUser(fresh);
}

async function update(user, payload, req) {
  const fresh = await User.findById(user._id);
  if (payload.name) fresh.name = payload.name;
  if (payload.avatarUrl !== undefined || payload.avatarPublicId !== undefined) {
    const nextPublicId = payload.avatarPublicId !== undefined ? payload.avatarPublicId : fresh.avatarPublicId;
    await uploadService.discardPrevious(fresh.avatarPublicId, nextPublicId, "image");
    if (payload.avatarUrl !== undefined) fresh.avatarUrl = payload.avatarUrl;
    if (payload.avatarPublicId !== undefined) fresh.avatarPublicId = payload.avatarPublicId;
  }
  if (payload.notifyInApp !== undefined) fresh.notifyInApp = payload.notifyInApp;
  await fresh.save();
  await auditService.log({
    actor: fresh,
    action: "update_profile",
    module: "profile",
    resourceType: "User",
    resourceId: fresh._id,
    req,
  });
  return get(fresh);
}

module.exports = { get, update };

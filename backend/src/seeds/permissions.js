const Permission = require("../models/Permission");
const Role = require("../models/Role");
const { PERMISSIONS } = require("../constants/permissions");

const OBSOLETE_PERMISSIONS = [
  "companies.view",
  "companies.create",
  "companies.update",
  "companies.delete",
  "deals.view",
  "deals.create",
  "deals.update",
  "deals.delete",
];

async function seedPermissions() {
  for (const permission of PERMISSIONS) {
    await Permission.updateOne({ name: permission.name }, { $set: permission }, { upsert: true });
  }
  const obsolete = await Permission.find({ name: { $in: OBSOLETE_PERMISSIONS } }).select("_id").lean();
  const ids = obsolete.map((item) => item._id);
  if (ids.length) {
    await Role.updateMany({}, { $pull: { permissionIds: { $in: ids } } });
    await Permission.deleteMany({ _id: { $in: ids } });
  }
  return Permission.find().lean();
}

module.exports = { seedPermissions };

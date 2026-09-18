const env = require("../config/env");
const logger = require("../config/logger");
const { connectDb, disconnectDb } = require("../config/db");
const { seedPermissions } = require("./permissions");
const { seedRoles } = require("./roles");
const { seedSuperAdmin } = require("./superAdmin");
const { seedSampleForm, seedVerificationForm } = require("./forms");
const { seedExport } = require("./export");
const { seedBilling } = require("./billing");

async function seed() {
  await connectDb(env.MONGO_URI);
  const permissions = await seedPermissions();
  const roles = await seedRoles(permissions);
  const superAdminRole = roles.find((role) => role.isSuperAdmin);
  const admin = await seedSuperAdmin(superAdminRole);
  await seedSampleForm(admin);
  await seedVerificationForm(admin);
  await seedExport();
  await seedBilling();
  logger.info({ email: admin.email }, "Seed complete");
  await disconnectDb();
}

if (require.main === module) {
  seed().catch((error) => {
    logger.fatal({ err: error }, "Seed failed");
    process.exit(1);
  });
}

module.exports = { seed };

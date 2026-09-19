const env = require("../config/env");
const logger = require("../config/logger");
const { connectDb, disconnectDb } = require("../config/db");
const { seedPermissions } = require("./permissions");
const { seedRoles } = require("./roles");
const { seedSuperAdmin } = require("./superAdmin");
const { seedSampleForm, seedVerificationForm, seedProductVerificationForm } = require("./forms");
const { seedExport } = require("./export");
const { seedBilling } = require("./billing");
const { seedDocumentTemplates } = require("./documents");
const { migrateExportProducts } = require("../modules/products/product.migrate");

async function seed() {
  await connectDb(env.MONGO_URI);
  const permissions = await seedPermissions();
  const roles = await seedRoles(permissions);
  const superAdminRole = roles.find((role) => role.isSuperAdmin);
  const admin = await seedSuperAdmin(superAdminRole);
  await seedSampleForm(admin);
  await seedVerificationForm(admin);
  await seedProductVerificationForm(admin);
  await seedDocumentTemplates(admin);
  await seedExport();
  await migrateExportProducts();
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

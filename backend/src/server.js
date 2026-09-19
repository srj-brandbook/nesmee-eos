const env = require("./config/env");
const logger = require("./config/logger");
const { connectDb } = require("./config/db");
const { createApp } = require("./app");
const { startActivityReminders } = require("./jobs/activityReminders");
const { startExportAlerts } = require("./jobs/exportAlerts");
const { startVerificationExpiry } = require("./jobs/verificationExpiry");
const { startInvoiceOverdue } = require("./jobs/invoiceOverdue");
const { migrateExportProducts } = require("./modules/products/product.migrate");

async function start() {
  await connectDb(env.MONGO_URI);
  try {
    await migrateExportProducts();
  } catch (error) {
    logger.error({ err: error }, "Failed to migrate export products into catalog");
  }
  const app = createApp();
  if (env.NODE_ENV !== "test") {
    const cron = require("node-cron");
    startActivityReminders(cron);
    startExportAlerts(cron);
    startVerificationExpiry(cron);
    startInvoiceOverdue(cron);
  }
  app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`);
  });
}

start().catch((error) => {
  logger.fatal({ err: error }, "Failed to start server");
  process.exit(1);
});

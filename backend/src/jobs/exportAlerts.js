const ExportAlert = require("../models/ExportAlert");
const logger = require("../config/logger");
const intelligenceService = require("../modules/export/intelligence.service");

async function processExportAlerts() {
  const created = await intelligenceService.processExportAlerts();
  if (created) logger.info({ count: created }, "Export alerts processed");
  return created;
}

function startExportAlerts(cron) {
  return cron.schedule("*/15 * * * *", () => {
    processExportAlerts().catch((error) => {
      logger.error({ err: error }, "Export alert job failed");
    });
  });
}

module.exports = { processExportAlerts, startExportAlerts, ExportAlert };

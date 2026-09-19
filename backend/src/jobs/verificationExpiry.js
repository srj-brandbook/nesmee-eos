const VerificationDocument = require("../models/VerificationDocument");
const VerificationCase = require("../models/VerificationCase");
const Lead = require("../models/Lead");
const logger = require("../config/logger");
const notificationService = require("../modules/notifications/notification.service");
const { recomputeLeadRollup, recomputeProductRollup, startOfDay, addDays } = require("../modules/verification/verification.service");
const { EXPIRING_SOON_DAYS } = require("../constants/verification");

function noticeKey(days) {
  if (days <= 0) return "d0At";
  if (days <= 7) return "d7At";
  return "d30At";
}

async function notifyExpiry(doc, caseDoc, lead, daysLeft) {
  const when = daysLeft <= 0 ? "has expired" : `expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
  const recipients = [caseDoc?.assignedToId, lead?.ownerId].filter(Boolean);
  const unique = [...new Set(recipients.map((id) => String(id)))];
  for (const userId of unique) {
    await notificationService.create({
      userId,
      type: "verification_expiring",
      title: daysLeft <= 0 ? `Document expired: ${doc.label || doc.title}` : `Document expiring: ${doc.label || doc.title}`,
      body: `${lead?.name || "Supplier"} — ${doc.label || doc.title} ${when}.`,
      data: {
        caseId: String(doc.caseId),
        documentId: String(doc._id),
        leadId: String(doc.leadId),
        daysLeft,
      },
    });
  }
}

async function processVerificationExpiry(now = new Date()) {
  const today = startOfDay(now);
  const horizon = addDays(today, EXPIRING_SOON_DAYS);
  const docs = await VerificationDocument.find({
    deletedAt: null,
    expiresAt: { $ne: null, $lte: horizon },
    status: { $in: ["verified", "submitted"] },
  }).limit(200);

  let expired = 0;
  let notified = 0;
  const leadIds = new Set();
  const productIds = new Set();

  for (const doc of docs) {
    const expires = startOfDay(doc.expiresAt);
    const daysLeft = Math.round((expires.getTime() - today.getTime()) / 86400000);
    const caseDoc = await VerificationCase.findById(doc.caseId);
    const lead = await Lead.findById(doc.leadId).select("name ownerId").lean();
    if (!caseDoc || caseDoc.status === "cancelled" || caseDoc.deletedAt) continue;

    if (daysLeft <= 0 && doc.status !== "expired") {
      doc.status = "expired";
      doc.reviews.push({ action: "expired", note: "Expired automatically", actorId: null, createdAt: now });
      if (!doc.expiryNotices) doc.expiryNotices = {};
      if (!doc.expiryNotices.d0At) {
        doc.expiryNotices.d0At = now;
        await notifyExpiry(doc, caseDoc, lead, 0);
        notified += 1;
      }
      await doc.save();
      const siblings = await VerificationDocument.find({ caseId: caseDoc._id, deletedAt: null });
      if (siblings.some((item) => item.required && item.status === "expired") && caseDoc.status !== "cancelled") {
        caseDoc.status = "expired";
        await caseDoc.save();
      }
      leadIds.add(String(doc.leadId));
      if (doc.productId) productIds.add(String(doc.productId));
      expired += 1;
      continue;
    }

    if (daysLeft <= 0) continue;
    const key = noticeKey(daysLeft);
    if (!doc.expiryNotices) doc.expiryNotices = {};
    if (doc.expiryNotices[key]) continue;
    if (key === "d7At" && daysLeft > 7) continue;
    if (key === "d30At" && daysLeft > 30) continue;
    doc.expiryNotices[key] = now;
    await doc.save();
    await notifyExpiry(doc, caseDoc, lead, daysLeft);
    notified += 1;
  }

  for (const leadId of leadIds) {
    await recomputeLeadRollup(leadId);
  }
  for (const productId of productIds) {
    await recomputeProductRollup(productId);
  }

  if (expired || notified) logger.info({ expired, notified }, "Verification expiry job ran");
  return { expired, notified };
}

function startVerificationExpiry(cron) {
  return cron.schedule("15 6 * * *", () => {
    processVerificationExpiry().catch((error) => {
      logger.error({ err: error }, "Verification expiry job failed");
    });
  });
}

module.exports = { processVerificationExpiry, startVerificationExpiry };

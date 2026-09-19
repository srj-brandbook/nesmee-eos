const Lead = require("../../models/Lead");
const Activity = require("../../models/Activity");
const Product = require("../../models/Product");
const VerificationCase = require("../../models/VerificationCase");
const Document = require("../../models/Document");
const FormSubmission = require("../../models/FormSubmission");
const ServiceJob = require("../../models/ServiceJob");
const Invoice = require("../../models/Invoice");
const User = require("../../models/User");
const Notification = require("../../models/Notification");
const AuditLog = require("../../models/AuditLog");
const leadService = require("../leads/lead.service");
const intelligenceService = require("../export/intelligence.service");
const reportsService = require("../billing/reports.service");
const { OPEN_VERIFICATION_STATUSES } = require("../../constants/verification");

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const JOBS_IN_FLIGHT = ["confirmed", "in_progress", "awaiting_authority", "delivered"];
const MAX_KPIS = 8;

function notDeleted(extra = {}) {
  return { deletedAt: null, ...extra };
}

function can(req, permission) {
  if (!req.user || req.user.status === "pending_verification") return false;
  if (req.isSuperAdmin) return true;
  return (req.permissions || []).includes(permission);
}

function utcDayStart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcDayKey(date) {
  return utcDayStart(date).toISOString().slice(0, 10);
}

function emptyTrend(now) {
  return lastSevenDays(now).map((date) => ({
    name: WEEKDAYS[date.getUTCDay()],
    date: utcDayKey(date),
    value: 0,
  }));
}

function lastSevenDays(now) {
  const end = utcDayStart(now);
  return Array.from({ length: 7 }, (_, index) => new Date(end.getTime() - (6 - index) * 24 * 60 * 60 * 1000));
}

function buildTrend(now, series) {
  return lastSevenDays(now).map((date) => {
    const key = utcDayKey(date);
    const point = { name: WEEKDAYS[date.getUTCDay()], date: key, value: 0 };
    Object.entries(series).forEach(([name, counts]) => {
      const count = counts[key] || 0;
      point[name] = count;
      point.value += count;
    });
    return point;
  });
}

async function countByUtcDay(Model, match, field = "createdAt") {
  const rows = await Model.aggregate([
    { $match: match },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: `$${field}` } }, count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}

function pushKpi(kpis, item) {
  if (!item || kpis.length >= MAX_KPIS) return;
  kpis.push(item);
}

function pushAttention(attention, item) {
  if (!item || !item.value) return;
  attention.push({
    key: item.key,
    severity: item.severity || "warning",
    title: item.title,
    hint: item.hint || "",
    href: item.href,
    value: item.value,
  });
}

async function overview(req) {
  const now = new Date();
  const trendFrom = lastSevenDays(now)[0];
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const unread = await Notification.countDocuments({ userId: req.user._id, readAt: null });

  const payload = {
    generatedAt: now.toISOString(),
    emailVerificationRequired: req.user.status === "pending_verification",
    kpis: [],
    attention: [],
    activityTrend: emptyTrend(now),
    recentActivity: [],
    workspace: { unread },
    sourcing: null,
    products: null,
    verification: null,
    export: null,
    billing: null,
    documents: null,
    onboarding: null,
  };

  if (payload.emailVerificationRequired) {
    payload.kpis.push({
      key: "unread",
      label: "Unread notifications",
      value: unread,
      hint: unread ? "Waiting in your inbox" : "You're caught up",
      href: "/notifications",
      icon: "bell",
      tone: unread ? "warning" : "default",
    });
    const notes = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(8).lean();
    payload.recentActivity = notes.map(serializeNotification);
    return payload;
  }

  const trendSeries = {};
  const tasks = [];

  if (can(req, "users.view")) {
    tasks.push(
      User.countDocuments(notDeleted()).then((users) => {
        payload.workspace.users = users;
      })
    );
  }

  if (can(req, "leads.view")) {
    tasks.push(
      (async () => {
        const [sourcing, openTasks, overdueTasks, leadTrend] = await Promise.all([
          leadService.dashboard(),
          can(req, "activities.view")
            ? Activity.countDocuments(notDeleted({ type: "task", status: "scheduled" }))
            : 0,
          can(req, "activities.view")
            ? Activity.countDocuments(notDeleted({ type: "task", status: "scheduled", dueAt: { $lt: now } }))
            : 0,
          countByUtcDay(Lead, notDeleted({ createdAt: { $gte: trendFrom } })),
        ]);
        payload.sourcing = { ...sourcing, openTasks, overdueTasks };
        trendSeries.leads = leadTrend;
      })()
    );
  }

  if (can(req, "products.view")) {
    tasks.push(
      (async () => {
        const [total, listed, inVerification, draft, productTrend] = await Promise.all([
          Product.countDocuments(notDeleted()),
          Product.countDocuments(notDeleted({ listingStatus: "listed" })),
          Product.countDocuments(notDeleted({ status: "in_verification" })),
          Product.countDocuments(notDeleted({ status: "draft" })),
          countByUtcDay(Product, notDeleted({ createdAt: { $gte: trendFrom } })),
        ]);
        payload.products = { total, listed, inVerification, draft };
        trendSeries.products = productTrend;
      })()
    );
  }

  if (can(req, "verification.view")) {
    tasks.push(
      (async () => {
        const [open, awaitingReview, overdue, verificationTrend] = await Promise.all([
          VerificationCase.countDocuments(notDeleted({ status: { $in: OPEN_VERIFICATION_STATUSES } })),
          VerificationCase.countDocuments(notDeleted({ status: "submitted" })),
          VerificationCase.countDocuments(
            notDeleted({ status: { $in: OPEN_VERIFICATION_STATUSES }, dueAt: { $ne: null, $lt: now } })
          ),
          countByUtcDay(VerificationCase, notDeleted({ createdAt: { $gte: trendFrom } })),
        ]);
        payload.verification = { open, awaitingReview, overdue };
        trendSeries.verification = verificationTrend;
      })()
    );
  }

  if (can(req, "export.view")) {
    tasks.push(
      intelligenceService.dashboard(req).then((data) => {
        payload.export = {
          activeMarkets: data.activeMarkets,
          underEvaluation: data.underEvaluation,
          activeCorridors: data.activeCorridors,
          activeBuyers: data.activeBuyers,
          newOpportunities: data.newOpportunities,
          highRiskMarkets: data.highRiskMarkets,
          highRiskCorridors: data.highRiskCorridors,
          pendingCompliance: data.pendingCompliance,
          expiringRequirements: data.expiringRequirements,
          expectedRevenue: data.expectedRevenue,
          averageMargin: data.averageMargin,
          averageTransitTime: data.averageTransitTime,
          alerts: (data.alerts || []).slice(0, 4),
        };
      })
    );
  }

  if (can(req, "billing.reports.view")) {
    tasks.push(
      reportsService.summary(now).then((summary) => {
        payload.billing = summary;
      })
    );
  } else if (can(req, "services.jobs.view") || can(req, "invoices.view")) {
    tasks.push(
      (async () => {
        const [jobsInFlight, overdueCount, jobsTrend] = await Promise.all([
          can(req, "services.jobs.view")
            ? ServiceJob.countDocuments(notDeleted({ status: { $in: JOBS_IN_FLIGHT } }))
            : 0,
          can(req, "invoices.view")
            ? Invoice.countDocuments(notDeleted({ type: "invoice", status: "overdue" }))
            : 0,
          can(req, "services.jobs.view")
            ? countByUtcDay(ServiceJob, notDeleted({ createdAt: { $gte: trendFrom } }))
            : {},
        ]);
        payload.billing = { jobsInFlight, overdueCount };
        if (can(req, "services.jobs.view")) trendSeries.jobs = jobsTrend;
      })()
    );
  }

  if (can(req, "billing.reports.view") && can(req, "services.jobs.view")) {
    tasks.push(
      countByUtcDay(ServiceJob, notDeleted({ createdAt: { $gte: trendFrom } })).then((jobsTrend) => {
        trendSeries.jobs = jobsTrend;
      })
    );
  }

  if (can(req, "documents.view")) {
    tasks.push(
      (async () => {
        const [draft, inReview, issuedMtd, missingFields, documentTrend] = await Promise.all([
          Document.countDocuments(notDeleted({ status: "draft" })),
          Document.countDocuments(notDeleted({ status: "in_review" })),
          Document.countDocuments(notDeleted({ status: { $in: ["issued", "filed"] }, issuedAt: { $gte: monthStart } })),
          Document.countDocuments(
            notDeleted({ status: { $in: ["draft", "in_review"] }, "missingVariables.0": { $exists: true } })
          ),
          countByUtcDay(Document, notDeleted({ createdAt: { $gte: trendFrom } })),
        ]);
        payload.documents = { draft, inReview, issuedMtd, missingFields };
        trendSeries.documents = documentTrend;
      })()
    );
  }

  if (can(req, "forms.view")) {
    tasks.push(
      FormSubmission.countDocuments({
        purpose: { $in: ["supplier_onboarding", "distributor_onboarding"] },
        status: { $in: ["draft", "submitted"] },
      }).then((pendingOnboarding) => {
        payload.onboarding = { pending: pendingOnboarding };
      })
    );
  }

  if (can(req, "audit.view")) {
    tasks.push(
      AuditLog.find().sort({ createdAt: -1 }).limit(8).lean().then((items) => {
        payload.recentActivity = items.map(serializeAudit);
      })
    );
  } else {
    tasks.push(
      Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean()
        .then((items) => {
          payload.recentActivity = items.map(serializeNotification);
        })
    );
  }

  await Promise.all(tasks);
  payload.activityTrend = buildTrend(now, trendSeries);
  payload.kpis = buildKpis(payload);
  payload.attention = buildAttention(payload);
  return payload;
}

function serializeAudit(item) {
  return {
    id: String(item._id),
    title: `${item.module}.${item.action}`,
    subtitle: item.actorEmail || "System",
    at: item.createdAt,
    href: "/audit-logs",
  };
}

function serializeNotification(item) {
  return {
    id: String(item._id),
    title: item.title,
    subtitle: item.body || "",
    at: item.createdAt,
    href: "/notifications",
  };
}

function buildKpis(payload) {
  const kpis = [];
  const sourcing = payload.sourcing;
  const products = payload.products;
  const verification = payload.verification;
  const exp = payload.export;
  const billing = payload.billing;
  const documents = payload.documents;

  if (sourcing) {
    pushKpi(kpis, {
      key: "inProcess",
      label: "Leads in process",
      value: sourcing.inProcess,
      hint: `${sourcing.leadsThisWeek || 0} new this week`,
      href: "/leads",
      icon: "factory",
      tone: "default",
    });
    pushKpi(kpis, {
      key: "suppliers",
      label: "Won suppliers",
      value: sourcing.won,
      hint: `${sourcing.converted || 0} converted · ${sourcing.lost || 0} lost`,
      href: "/suppliers",
      icon: "handshake",
      tone: sourcing.won ? "success" : "default",
    });
    pushKpi(kpis, {
      key: "overdueFollowUps",
      label: "Overdue follow-ups",
      value: sourcing.overdueFollowUps,
      hint: sourcing.upcomingMeetings?.[0] ? "Next meeting is on the calendar" : "No upcoming meetings",
      href: "/follow-ups",
      icon: "bell",
      tone: sourcing.overdueFollowUps ? "warning" : "default",
    });
  }

  if (products) {
    pushKpi(kpis, {
      key: "listedProducts",
      label: "Listed products",
      value: products.listed,
      hint: `${products.inVerification || 0} in verification · ${products.draft || 0} drafts`,
      href: "/products",
      icon: "package",
      tone: "default",
    });
  }

  if (verification) {
    pushKpi(kpis, {
      key: "openVerification",
      label: "Open verification",
      value: verification.open,
      hint: `${verification.awaitingReview || 0} awaiting review`,
      href: "/verification",
      icon: "shield",
      tone: verification.overdue ? "danger" : verification.open ? "warning" : "success",
    });
  }

  if (exp) {
    pushKpi(kpis, {
      key: "activeMarkets",
      label: "Active markets",
      value: exp.activeMarkets,
      hint: `${exp.underEvaluation || 0} under evaluation`,
      href: "/export",
      icon: "globe",
      tone: exp.highRiskMarkets ? "warning" : "default",
    });
  }

  if (billing && billing.outstanding !== undefined) {
    pushKpi(kpis, {
      key: "outstanding",
      label: "Outstanding",
      value: billing.outstanding,
      hint: `${billing.openInvoiceCount || 0} open invoices`,
      href: "/billing",
      icon: "wallet",
      tone: billing.overdue ? "danger" : "default",
      format: "inr",
    });
  } else if (billing) {
    pushKpi(kpis, {
      key: "jobsInFlight",
      label: "Jobs in flight",
      value: billing.jobsInFlight || 0,
      hint: billing.overdueCount ? `${billing.overdueCount} overdue invoices` : "Service jobs underway",
      href: "/billing/jobs",
      icon: "clipboard",
      tone: billing.overdueCount ? "warning" : "default",
    });
  }

  if (documents && kpis.length < MAX_KPIS) {
    pushKpi(kpis, {
      key: "issuedDocuments",
      label: "Issued this month",
      value: documents.issuedMtd,
      hint: `${documents.draft || 0} drafts · ${documents.missingFields || 0} missing fields`,
      href: "/documents",
      icon: "file",
      tone: documents.missingFields ? "warning" : "default",
    });
  }

  if (payload.workspace.users !== undefined && kpis.length < MAX_KPIS) {
    pushKpi(kpis, {
      key: "users",
      label: "Users",
      value: payload.workspace.users,
      href: "/users",
      icon: "users",
      tone: "default",
    });
  }

  pushKpi(kpis, {
    key: "unread",
    label: "Unread notifications",
    value: payload.workspace.unread,
    hint: payload.workspace.unread ? "Waiting in your inbox" : "You're caught up",
    href: "/notifications",
    icon: "bell",
    tone: payload.workspace.unread ? "warning" : "default",
  });

  return kpis;
}

function buildAttention(payload) {
  const attention = [];
  const sourcing = payload.sourcing;
  const products = payload.products;
  const verification = payload.verification;
  const exp = payload.export;
  const billing = payload.billing;
  const documents = payload.documents;
  const onboarding = payload.onboarding;

  if (sourcing) {
    pushAttention(attention, {
      key: "overdue-follow-ups",
      value: sourcing.overdueFollowUps,
      severity: "warning",
      title: `${sourcing.overdueFollowUps} overdue follow-up${sourcing.overdueFollowUps === 1 ? "" : "s"}`,
      hint: "Chase manufacturers that slipped past their due date",
      href: "/follow-ups",
    });
    pushAttention(attention, {
      key: "overdue-tasks",
      value: sourcing.overdueTasks,
      severity: "warning",
      title: `${sourcing.overdueTasks} overdue task${sourcing.overdueTasks === 1 ? "" : "s"}`,
      hint: "Open the task manager and close or reschedule them",
      href: "/tasks",
    });
  }

  if (verification) {
    pushAttention(attention, {
      key: "verification-overdue",
      value: verification.overdue,
      severity: "danger",
      title: `${verification.overdue} verification case${verification.overdue === 1 ? "" : "s"} past due`,
      hint: "Review or reassign cases that missed their due date",
      href: "/verification",
    });
    pushAttention(attention, {
      key: "verification-review",
      value: verification.awaitingReview,
      severity: "warning",
      title: `${verification.awaitingReview} case${verification.awaitingReview === 1 ? "" : "s"} awaiting review`,
      hint: "Submitted evidence is waiting on a decision",
      href: "/verification",
    });
  }

  if (products) {
    pushAttention(attention, {
      key: "products-verification",
      value: products.inVerification,
      severity: "warning",
      title: `${products.inVerification} product${products.inVerification === 1 ? "" : "s"} in verification`,
      hint: "Finish checks before listing them to distributors",
      href: "/products",
    });
  }

  if (exp) {
    pushAttention(attention, {
      key: "high-risk-markets",
      value: exp.highRiskMarkets,
      severity: "danger",
      title: `${exp.highRiskMarkets} high-risk market${exp.highRiskMarkets === 1 ? "" : "s"}`,
      hint: "Revisit scoring before committing corridors",
      href: "/export/markets",
    });
    pushAttention(attention, {
      key: "pending-compliance",
      value: exp.pendingCompliance,
      severity: "warning",
      title: `${exp.pendingCompliance} pending compliance item${exp.pendingCompliance === 1 ? "" : "s"}`,
      hint: "Requirements still in draft or pending",
      href: "/export",
    });
    pushAttention(attention, {
      key: "expiring-requirements",
      value: exp.expiringRequirements,
      severity: "warning",
      title: `${exp.expiringRequirements} requirement${exp.expiringRequirements === 1 ? "" : "s"} expiring soon`,
      hint: "Renew certificates before they lapse",
      href: "/export",
    });
  }

  if (billing) {
    pushAttention(attention, {
      key: "overdue-invoices",
      value: billing.overdueCount,
      severity: "danger",
      title: `${billing.overdueCount} overdue invoice${billing.overdueCount === 1 ? "" : "s"}`,
      hint: billing.overdue !== undefined ? "Outstanding balances have passed their due date" : "Follow up on unpaid invoices",
      href: "/billing/invoices",
    });
  }

  if (documents) {
    pushAttention(attention, {
      key: "missing-fields",
      value: documents.missingFields,
      severity: "warning",
      title: `${documents.missingFields} document${documents.missingFields === 1 ? "" : "s"} missing fields`,
      hint: "Fill merge variables before issuing",
      href: "/documents",
    });
  }

  if (onboarding) {
    pushAttention(attention, {
      key: "onboarding-pending",
      value: onboarding.pending,
      severity: "warning",
      title: `${onboarding.pending} onboarding submission${onboarding.pending === 1 ? "" : "s"} open`,
      hint: "Draft or submitted forms still need a decision",
      href: "/onboarding",
    });
  }

  return attention.slice(0, 8);
}

module.exports = { overview };

export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  dashboard: "/dashboard",
  users: "/users",
  roles: "/roles",
  notifications: "/notifications",
  profile: "/settings/profile",
  security: "/settings/security",
  application: "/settings/application",
  permissions: "/settings/permissions",
  auditLogs: "/audit-logs",
  forbidden: "/forbidden",
  leads: "/leads",
  suppliers: "/suppliers",
  calendar: "/calendar",
  appointments: "/appointments",
  meetings: "/meetings",
  tasks: "/tasks",
  followUps: "/follow-ups",
  forms: "/forms",
  onboarding: "/onboarding",
  verification: "/verification",
  products: "/products",
  export: "/export",
  exportMarkets: "/export/markets",
  exportCorridors: "/export/corridors",
  exportDistributors: "/export/distributors",
  exportBuyers: "/export/distributors",
  exportOpportunities: "/export/opportunities",
  exportCalculator: "/export/calculator",
  exportAnalytics: "/export/analytics",
  exportAlerts: "/export/alerts",
  exportSettings: "/export/settings",
  exportPricing: "/export/pricing",
  billing: "/billing",
  billingServices: "/billing/services",
  billingJobs: "/billing/jobs",
  billingInvoices: "/billing/invoices",
  billingPayments: "/billing/payments",
  billingSettings: "/settings/billing",
  documents: "/documents",
  documentTemplates: "/documents/templates",
};

export function verificationCasePath(id) {
  return `${ROUTES.verification}/${id}`;
}

export function verificationReviewPath(id) {
  return `${ROUTES.verification}/${id}/review`;
}

export const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];
export const AUTH_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];

export function isFormBuilderPath(pathname) {
  if (!pathname?.startsWith("/forms/")) return false;
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "forms" || segments.length < 2 || segments[1] === "new") return false;
  if (segments.length === 2) return true;
  return segments[2] === "rules";
}

export function isDocumentStudioPath(pathname) {
  if (!pathname?.startsWith("/documents/")) return false;
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "documents" || segments.length < 2) return false;
  if (segments.includes("print") || segments[1] === "new") return false;
  if (segments[1] === "templates") return segments.length === 3;
  return segments.length === 2;
}

export function isImmersiveEditorPath(pathname) {
  return isFormBuilderPath(pathname) || isDocumentStudioPath(pathname);
}

export function directoryProfilePath(subjectType, subjectId) {
  if (subjectType === "lead" && subjectId) return `${ROUTES.suppliers}/${subjectId}`;
  if (subjectType === "buyer" && subjectId) return `${ROUTES.exportDistributors}/${subjectId}`;
  return ROUTES.onboarding;
}

export function onboardingSubjectPath(item) {
  if (!item?.subjectId) return ROUTES.onboarding;
  if (item.status === "approved") return directoryProfilePath(item.subjectType, item.subjectId);
  if (item.subjectType === "lead") return `${ROUTES.leads}/${item.subjectId}`;
  if (item.subjectType === "buyer") return `${ROUTES.exportDistributors}/${item.subjectId}`;
  return ROUTES.onboarding;
}

export const APP_PREFIXES = [
  "/dashboard",
  "/users",
  "/roles",
  "/notifications",
  "/settings",
  "/audit-logs",
  "/leads",
  "/suppliers",
  "/calendar",
  "/appointments",
  "/meetings",
  "/tasks",
  "/follow-ups",
  "/forms",
  "/onboarding",
  "/verification",
  "/products",
  "/export",
  "/billing",
  "/documents",
];

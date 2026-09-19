import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export const navGroups = [
  { id: "workspace", label: "Workspace" },
  { id: "sourcing", label: "Sourcing" },
  { id: "export", label: "Export" },
  { id: "billing", label: "Billing" },
  { id: "admin", label: "Admin" },
  { id: "system", label: "System" },
];

export const navItems = [
  { href: ROUTES.dashboard, label: "Dashboard", icon: "LayoutDashboard", group: "workspace" },
  { href: ROUTES.leads, label: "Leads", icon: "Factory", group: "sourcing", permission: PERMISSIONS.LEADS_VIEW },
  { href: ROUTES.suppliers, label: "Suppliers", icon: "Handshake", group: "sourcing", permission: PERMISSIONS.LEADS_VIEW },
  { href: ROUTES.products, label: "Products", icon: "Package", group: "sourcing", permission: PERMISSIONS.PRODUCTS_VIEW },
  { href: ROUTES.appointments, label: "Appointments", icon: "CalendarCheck", group: "sourcing", permission: PERMISSIONS.ACTIVITIES_VIEW },
  { href: ROUTES.meetings, label: "Meetings", icon: "Video", group: "sourcing", permission: PERMISSIONS.ACTIVITIES_VIEW },
  { href: ROUTES.tasks, label: "Tasks", icon: "ListTodo", group: "sourcing", permission: PERMISSIONS.ACTIVITIES_VIEW },
  { href: ROUTES.followUps, label: "Follow-ups", icon: "Bell", group: "sourcing", permission: PERMISSIONS.ACTIVITIES_VIEW },
  { href: ROUTES.calendar, label: "Calendar", icon: "CalendarDays", group: "sourcing", permission: PERMISSIONS.CALENDAR_VIEW },
  { href: ROUTES.onboarding, label: "Onboarding", icon: "ClipboardCheck", group: "workspace", permission: PERMISSIONS.FORMS_VIEW },
  { href: ROUTES.documents, label: "Documents", icon: "FileStack", group: "workspace", permission: PERMISSIONS.DOCUMENTS_VIEW },
  { href: ROUTES.verification, label: "Verification", icon: "Shield", group: "sourcing", permission: PERMISSIONS.VERIFICATION_VIEW },
  { href: ROUTES.export, label: "Export dashboard", icon: "Globe", group: "export", permission: PERMISSIONS.EXPORT_VIEW, exact: true },
  { href: ROUTES.exportMarkets, label: "Markets", icon: "MapPinned", group: "export", permission: PERMISSIONS.EXPORT_MARKETS_VIEW },
  { href: ROUTES.exportCorridors, label: "Corridors", icon: "Route", group: "export", permission: PERMISSIONS.EXPORT_CORRIDORS_VIEW },
  { href: ROUTES.exportDistributors, label: "Distributors", icon: "Truck", group: "export", permission: PERMISSIONS.EXPORT_BUYERS_VIEW },
  { href: ROUTES.exportOpportunities, label: "Opportunities", icon: "Kanban", group: "export", permission: PERMISSIONS.EXPORT_OPPORTUNITIES_VIEW },
  { href: ROUTES.exportCalculator, label: "Landed cost", icon: "Calculator", group: "export", permission: PERMISSIONS.EXPORT_CALCULATOR_VIEW },
  { href: ROUTES.exportAnalytics, label: "Analytics", icon: "ChartColumn", group: "export", permission: PERMISSIONS.EXPORT_ANALYTICS_VIEW },
  { href: ROUTES.exportAlerts, label: "Export alerts", icon: "BellRing", group: "export", permission: PERMISSIONS.EXPORT_ALERTS_VIEW },
  { href: ROUTES.exportSettings, label: "Export settings", icon: "SlidersHorizontal", group: "export", permission: PERMISSIONS.EXPORT_SETTINGS_VIEW },
  { href: ROUTES.billing, label: "Billing", icon: "Wallet", group: "billing", permission: PERMISSIONS.BILLING_REPORTS_VIEW, exact: true },
  { href: ROUTES.billingServices, label: "Services", icon: "Briefcase", group: "billing", permission: PERMISSIONS.SERVICES_VIEW },
  { href: ROUTES.billingJobs, label: "Jobs", icon: "ClipboardList", group: "billing", permission: PERMISSIONS.SERVICES_JOBS_VIEW },
  { href: ROUTES.billingInvoices, label: "Invoices", icon: "FileText", group: "billing", permission: PERMISSIONS.INVOICES_VIEW },
  { href: ROUTES.billingPayments, label: "Payments", icon: "Banknote", group: "billing", permission: PERMISSIONS.PAYMENTS_VIEW },
  { href: ROUTES.users, label: "Users", icon: "Users", group: "admin", permission: PERMISSIONS.USERS_VIEW },
  { href: ROUTES.roles, label: "Roles", icon: "Shield", group: "admin", permission: PERMISSIONS.ROLES_VIEW },
  { href: ROUTES.forms, label: "Forms", icon: "ClipboardList", group: "admin", permission: PERMISSIONS.FORMS_VIEW },
  { href: ROUTES.notifications, label: "Notifications", icon: "Bell", group: "workspace" },
  { href: ROUTES.auditLogs, label: "Audit logs", icon: "ScrollText", group: "system", permission: PERMISSIONS.AUDIT_VIEW },
  {
    href: ROUTES.application,
    label: "Settings",
    icon: "Settings",
    group: "system",
    permission: PERMISSIONS.SETTINGS_VIEW,
    match: "/settings",
  },
];

export const settingsNav = [
  { href: ROUTES.profile, label: "Profile", icon: "User" },
  { href: ROUTES.security, label: "Security", icon: "Lock" },
  { href: ROUTES.application, label: "Application", icon: "SlidersHorizontal", permission: PERMISSIONS.SETTINGS_VIEW },
  { href: ROUTES.billingSettings, label: "Billing", icon: "Wallet", permission: PERMISSIONS.BILLING_SETTINGS_VIEW },
  { href: ROUTES.permissions, label: "Permissions", icon: "KeyRound", permission: PERMISSIONS.PERMISSIONS_VIEW },
];

export function isNavActive(pathname, item) {
  const base = item.match || item.href;
  if (item.exact) return pathname === base;
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function titleForPath(pathname) {
  const items = [...navItems, ...settingsNav];
  const match = items
    .filter((item) => isNavActive(pathname, item))
    .sort((a, b) => (b.match || b.href).length - (a.match || a.href).length)[0];
  return match?.label || "App";
}

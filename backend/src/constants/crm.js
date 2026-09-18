const LEAD_STAGES = ["new", "contacted", "qualified", "converted", "won", "lost", "disqualified"];
const PROCESS_STAGES = ["new", "contacted", "qualified"];
const ACTIVITY_TYPES = ["note", "follow_up", "appointment", "meeting", "call", "task", "status_change"];
const CALENDAR_TYPES = ["appointment", "meeting", "follow_up", "call"];
const ACTIVITY_STATUSES = ["scheduled", "done", "cancelled", "no_show"];
const LEAD_SOURCES = ["trade_show", "referral", "directory", "alibaba", "website", "outbound", "other"];
const EXTERNAL_PROVIDERS = ["google"];

const CRM_PERMISSIONS = [
  { name: "leads.view", module: "leads", action: "view", description: "View manufacturer leads" },
  { name: "leads.create", module: "leads", action: "create", description: "Create manufacturer leads" },
  { name: "leads.update", module: "leads", action: "update", description: "Update manufacturer leads" },
  { name: "leads.delete", module: "leads", action: "delete", description: "Delete manufacturer leads" },
  { name: "leads.convert", module: "leads", action: "convert", description: "Mark leads converted or won" },
  { name: "activities.view", module: "activities", action: "view", description: "View lead activities" },
  { name: "activities.create", module: "activities", action: "create", description: "Create lead activities" },
  { name: "activities.update", module: "activities", action: "update", description: "Update lead activities" },
  { name: "activities.delete", module: "activities", action: "delete", description: "Delete lead activities" },
  { name: "calendar.view", module: "calendar", action: "view", description: "View sourcing calendar" },
];

const SALES_PERMISSION_NAMES = CRM_PERMISSIONS.map((permission) => permission.name);

module.exports = {
  LEAD_STAGES,
  PROCESS_STAGES,
  ACTIVITY_TYPES,
  CALENDAR_TYPES,
  ACTIVITY_STATUSES,
  LEAD_SOURCES,
  EXTERNAL_PROVIDERS,
  CRM_PERMISSIONS,
  SALES_PERMISSION_NAMES,
};

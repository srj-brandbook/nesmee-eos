export const LEAD_STAGES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "disqualified", label: "Disqualified" },
];

export const PROCESS_STAGES = ["new", "contacted", "qualified"];
export const CLOSED_STAGES = ["converted", "won", "lost", "disqualified"];

export const LEAD_FORM_STAGES = LEAD_STAGES.filter((stage) => !["converted", "won"].includes(stage.value));

export const LEAD_SOURCES = [
  { value: "trade_show", label: "Trade show" },
  { value: "referral", label: "Referral" },
  { value: "directory", label: "Directory" },
  { value: "alibaba", label: "Alibaba" },
  { value: "website", label: "Website" },
  { value: "outbound", label: "Outbound" },
  { value: "other", label: "Other" },
];

export const ACTIVITY_TYPES = [
  { value: "note", label: "Note" },
  { value: "call", label: "Call" },
  { value: "follow_up", label: "Follow-up" },
  { value: "appointment", label: "Appointment" },
  { value: "meeting", label: "Meeting" },
  { value: "task", label: "Task" },
  { value: "status_change", label: "Status change" },
];

export const ACTIVITY_STATUSES = [
  { value: "scheduled", label: "Open" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

export const LEAD_PIPELINE = LEAD_STAGES.filter((stage) => !["lost", "disqualified"].includes(stage.value));

export const TIMED_ACTIVITY_TYPES = ["call", "appointment", "meeting"];
export const DUE_ACTIVITY_TYPES = ["follow_up", "task"];

export const CALENDAR_ACTIVITY_TYPES = ACTIVITY_TYPES.filter((type) =>
  ["call", "appointment", "meeting", "follow_up"].includes(type.value)
);

export function labelFor(list, value) {
  return list.find((item) => item.value === value)?.label || value || "—";
}

export function stageVariant(stage) {
  if (["won", "converted", "done"].includes(stage)) return "success";
  if (["lost", "disqualified", "cancelled", "no_show"].includes(stage)) return "danger";
  if (["qualified"].includes(stage)) return "primary";
  if (["contacted", "scheduled"].includes(stage)) return "warning";
  return "default";
}

export function locationLabel(lead) {
  return [lead?.city, lead?.country].filter(Boolean).join(", ") || "—";
}

export function websiteHref(url) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function isActivityOpen(activity) {
  return activity?.status === "scheduled";
}

export function isActivityOverdue(activity) {
  if (!isActivityOpen(activity)) return false;
  const when = activity.dueAt || activity.startsAt;
  return Boolean(when) && new Date(when) < new Date();
}

export function isFutureActivity(activity) {
  if (!isActivityOpen(activity)) return false;
  const when = activity.dueAt || activity.startsAt;
  return Boolean(when) && new Date(when) > new Date();
}

export function activityWhen(activity) {
  return activity?.startsAt || activity?.dueAt || activity?.createdAt;
}

export const LOG_ACTIVITY_TYPES = ACTIVITY_TYPES.filter((type) => type.value !== "status_change");

const ACTION_TYPES = {
  show_field: { type: "show_field", label: "Show Field", group: "field", targetKind: "field" },
  hide_field: { type: "hide_field", label: "Hide Field", group: "field", targetKind: "field" },
  make_required: { type: "make_required", label: "Make Required", group: "field", targetKind: "field" },
  make_optional: { type: "make_optional", label: "Make Optional", group: "field", targetKind: "field" },
  enable_field: { type: "enable_field", label: "Enable Field", group: "field", targetKind: "field" },
  disable_field: { type: "disable_field", label: "Disable Field", group: "field", targetKind: "field" },
  set_value: { type: "set_value", label: "Set Value", group: "field", targetKind: "field", hasConfig: true },
  clear_value: { type: "clear_value", label: "Clear Value", group: "field", targetKind: "field" },
  request_document: { type: "request_document", label: "Request Document", group: "document", targetKind: "document" },
  make_document_required: {
    type: "make_document_required",
    label: "Make Document Required",
    group: "document",
    targetKind: "document",
  },
  remove_document_requirement: {
    type: "remove_document_requirement",
    label: "Remove Document Requirement",
    group: "document",
    targetKind: "document",
  },
  activate_stage: { type: "activate_stage", label: "Activate Stage", group: "workflow", targetKind: "stage" },
  deactivate_stage: { type: "deactivate_stage", label: "Deactivate Stage", group: "workflow", targetKind: "stage" },
  assign_to: { type: "assign_to", label: "Assign To", group: "workflow", targetKind: "none", hasConfig: true },
  change_status: { type: "change_status", label: "Change Status", group: "workflow", targetKind: "none", hasConfig: true },
  create_task: { type: "create_task", label: "Create Task", group: "workflow", targetKind: "none", hasConfig: true },
  send_notification: {
    type: "send_notification",
    label: "Send Notification",
    group: "communication",
    targetKind: "none",
    hasConfig: true,
  },
  send_email: { type: "send_email", label: "Send Email", group: "communication", targetKind: "none", hasConfig: true },
  send_sms: { type: "send_sms", label: "Send SMS", group: "communication", targetKind: "none", hasConfig: true },
  send_webhook: { type: "send_webhook", label: "Send Webhook", group: "communication", targetKind: "none", hasConfig: true },
};

const ACTION_GROUPS = [
  { id: "field", label: "Field actions" },
  { id: "document", label: "Document actions" },
  { id: "workflow", label: "Workflow actions" },
  { id: "communication", label: "Communication" },
];

const CONFLICT_FAMILIES = {
  visibility: ["show_field", "hide_field"],
  required: ["make_required", "make_optional"],
  enabled: ["enable_field", "disable_field"],
  value: ["set_value", "clear_value"],
  document_request: ["request_document", "remove_document_requirement"],
  document_required: ["make_document_required", "remove_document_requirement"],
  stage: ["activate_stage", "deactivate_stage"],
};

function actionMeta(type) {
  return ACTION_TYPES[type] || null;
}

function actionsByGroup(group) {
  return Object.values(ACTION_TYPES).filter((item) => item.group === group);
}

function conflictFamily(actionType) {
  return Object.keys(CONFLICT_FAMILIES).find((family) => CONFLICT_FAMILIES[family].includes(actionType)) || actionType;
}

function createAction(type, overrides = {}) {
  const meta = ACTION_TYPES[type];
  if (!meta) throw new Error(`Unknown action: ${type}`);
  return {
    id: overrides.id || `act_${type}_${Math.random().toString(36).slice(2, 8)}`,
    action: type,
    target: overrides.target || "",
    config: overrides.config || {},
  };
}

module.exports = {
  ACTION_TYPES,
  ACTION_GROUPS,
  CONFLICT_FAMILIES,
  actionMeta,
  actionsByGroup,
  conflictFamily,
  createAction,
};

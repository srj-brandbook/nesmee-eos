const { defaultValueForType } = require("../models/factories");

function emptyFieldState(field) {
  return {
    visible: field?.visible !== false,
    required: Boolean(field?.required),
    readonly: Boolean(field?.readonly),
    disabled: Boolean(field?.readonly),
  };
}

function initialDerivedState(definition) {
  const fields = {};
  for (const field of definition.fields || []) {
    fields[field.key] = emptyFieldState(field);
  }
  const documents = {};
  for (const doc of definition.documents || []) {
    documents[doc.key] = { requested: false, required: Boolean(doc.required) };
  }
  const stages = {};
  for (const stage of definition.stages || []) {
    stages[stage.key] = { active: Boolean(stage.active) };
  }
  return {
    fields,
    documents,
    stages,
    assignment: null,
    status: null,
    tasks: [],
    communications: [],
  };
}

function cloneDerived(derived) {
  return JSON.parse(JSON.stringify(derived));
}

function applyAction(action, derived, values, definition) {
  const next = derived;
  const type = action.action;
  const target = action.target;
  const config = action.config || {};

  if (type === "show_field" && next.fields[target]) next.fields[target].visible = true;
  if (type === "hide_field" && next.fields[target]) next.fields[target].visible = false;
  if (type === "make_required" && next.fields[target]) next.fields[target].required = true;
  if (type === "make_optional" && next.fields[target]) next.fields[target].required = false;
  if (type === "enable_field" && next.fields[target]) {
    next.fields[target].disabled = false;
    next.fields[target].readonly = false;
  }
  if (type === "disable_field" && next.fields[target]) {
    next.fields[target].disabled = true;
    next.fields[target].readonly = true;
  }
  if (type === "set_value" && target) {
    values[target] = config.value;
    return { kind: "value", target, value: config.value };
  }
  if (type === "clear_value" && target) {
    const field = (definition.fields || []).find((item) => item.key === target);
    values[target] = field ? defaultValueForType(field.type) : "";
    return { kind: "value", target, value: values[target] };
  }
  if (type === "request_document" && next.documents[target]) next.documents[target].requested = true;
  if (type === "make_document_required" && next.documents[target]) {
    next.documents[target].requested = true;
    next.documents[target].required = true;
  }
  if (type === "remove_document_requirement" && next.documents[target]) {
    next.documents[target].required = false;
    next.documents[target].requested = false;
  }
  if (type === "activate_stage" && next.stages[target]) next.stages[target].active = true;
  if (type === "deactivate_stage" && next.stages[target]) next.stages[target].active = false;
  if (type === "assign_to") next.assignment = config.assignee || config.value || target || null;
  if (type === "change_status") next.status = config.status || config.value || target || null;
  if (type === "create_task") {
    next.tasks.push({ title: config.title || "Task", assignee: config.assignee || "", body: config.body || "" });
  }
  if (type === "send_notification" || type === "send_email" || type === "send_sms" || type === "send_webhook") {
    next.communications.push({
      type,
      to: config.to || "",
      subject: config.subject || "",
      message: config.message || config.body || "",
      url: config.url || "",
    });
  }
  return { kind: "state", target, type };
}

function describeAction(action, definition) {
  const field = (definition.fields || []).find((item) => item.key === action.target);
  const document = (definition.documents || []).find((item) => item.key === action.target);
  const stage = (definition.stages || []).find((item) => item.key === action.target);
  const name = field?.label || document?.label || stage?.label || action.target || action.config?.assignee || action.config?.status || "";
  const labels = {
    show_field: `Show ${name}`,
    hide_field: `Hide ${name}`,
    make_required: `Make ${name} required`,
    make_optional: `Make ${name} optional`,
    enable_field: `Enable ${name}`,
    disable_field: `Disable ${name}`,
    set_value: `Set ${name}`,
    clear_value: `Clear ${name}`,
    request_document: `Request ${name}`,
    make_document_required: `Make ${name} required`,
    remove_document_requirement: `Remove ${name} requirement`,
    activate_stage: `Activate ${name}`,
    deactivate_stage: `Deactivate ${name}`,
    assign_to: `Assign to ${action.config?.assignee || action.target || "assignee"}`,
    change_status: `Change status to ${action.config?.status || action.target}`,
    create_task: `Create task ${action.config?.title || ""}`.trim(),
    send_notification: "Send notification",
    send_email: "Send email",
    send_sms: "Send SMS",
    send_webhook: "Send webhook",
  };
  return labels[action.action] || action.action;
}

module.exports = { emptyFieldState, initialDerivedState, cloneDerived, applyAction, describeAction };

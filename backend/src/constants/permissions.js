const { CRM_PERMISSIONS } = require("./crm");
const { FORMS_PERMISSIONS } = require("./forms");
const { EXPORT_PERMISSIONS } = require("./export");
const { VERIFICATION_PERMISSIONS } = require("./verification");
const { BILLING_PERMISSIONS } = require("./billing");

const PERMISSIONS = [
  { name: "users.view", module: "users", action: "view", description: "View users" },
  { name: "users.create", module: "users", action: "create", description: "Create users" },
  { name: "users.update", module: "users", action: "update", description: "Update users" },
  { name: "users.delete", module: "users", action: "delete", description: "Delete users" },
  { name: "roles.view", module: "roles", action: "view", description: "View roles" },
  { name: "roles.create", module: "roles", action: "create", description: "Create roles" },
  { name: "roles.update", module: "roles", action: "update", description: "Update roles" },
  { name: "roles.delete", module: "roles", action: "delete", description: "Delete roles" },
  { name: "permissions.view", module: "permissions", action: "view", description: "View permission catalog" },
  { name: "settings.view", module: "settings", action: "view", description: "View application settings" },
  { name: "settings.update", module: "settings", action: "update", description: "Update application settings" },
  { name: "audit.view", module: "audit", action: "view", description: "View audit logs" },
  ...CRM_PERMISSIONS,
  ...FORMS_PERMISSIONS,
  ...EXPORT_PERMISSIONS,
  ...VERIFICATION_PERMISSIONS,
  ...BILLING_PERMISSIONS,
];

const PERMISSION_NAMES = PERMISSIONS.map((permission) => permission.name);

module.exports = { PERMISSIONS, PERMISSION_NAMES };

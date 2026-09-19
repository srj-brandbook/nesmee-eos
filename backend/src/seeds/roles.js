const Role = require("../models/Role");
const { SALES_PERMISSION_NAMES } = require("../constants/crm");
const {
  EXPORT_MANAGER_PERMISSIONS,
  COMPLIANCE_MANAGER_PERMISSIONS,
  FINANCE_PERMISSIONS,
  LOGISTICS_MANAGER_PERMISSIONS,
} = require("../constants/export");
const { COMPLIANCE_VERIFICATION_PERMISSIONS, SALES_VERIFICATION_PERMISSIONS } = require("../constants/verification");
const { COMPLIANCE_DOCUMENTS_PERMISSIONS, SALES_DOCUMENTS_PERMISSIONS } = require("../constants/documents");
const {
  SALES_PRODUCTS_PERMISSIONS,
  COMPLIANCE_PRODUCTS_PERMISSIONS,
  EXPORT_MANAGER_PRODUCTS_PERMISSIONS,
  FINANCE_PRODUCTS_PERMISSIONS,
} = require("../constants/products");
const {
  FINANCE_BILLING_PERMISSIONS,
  COMPLIANCE_BILLING_PERMISSIONS,
  SALES_BILLING_PERMISSIONS,
} = require("../constants/billing");

async function seedRoles(permissions) {
  const allIds = permissions.map((permission) => permission._id);
  const memberIds = [];
  const adminIds = permissions.map((permission) => permission._id);
  const salesIds = permissions
    .filter(
      (permission) =>
        SALES_PERMISSION_NAMES.includes(permission.name) ||
        SALES_VERIFICATION_PERMISSIONS.includes(permission.name) ||
        SALES_BILLING_PERMISSIONS.includes(permission.name) ||
        SALES_DOCUMENTS_PERMISSIONS.includes(permission.name) ||
        SALES_PRODUCTS_PERMISSIONS.includes(permission.name)
    )
    .map((permission) => permission._id);

  const roles = [
    {
      name: "Super Admin",
      slug: "super-admin",
      description: "Full access, bypasses permission checks",
      permissionIds: allIds,
      isSystem: true,
      isSuperAdmin: true,
    },
    {
      name: "Admin",
      slug: "admin",
      description: "Manages users, roles, and settings",
      permissionIds: adminIds,
      isSystem: true,
      isSuperAdmin: false,
    },
    {
      name: "Sales",
      slug: "sales",
      description: "Sourcing team: manufacturer leads, contacts, and calendar",
      permissionIds: salesIds,
      isSystem: true,
      isSuperAdmin: false,
    },
    {
      name: "Member",
      slug: "member",
      description: "Standard authenticated user",
      permissionIds: memberIds,
      isSystem: true,
      isSuperAdmin: false,
    },
    {
      name: "Export Manager",
      slug: "export-manager",
      description: "Owns export markets, corridors, opportunities, and analytics",
      permissionIds: permissions
        .filter(
          (permission) =>
            EXPORT_MANAGER_PERMISSIONS.includes(permission.name) || EXPORT_MANAGER_PRODUCTS_PERMISSIONS.includes(permission.name)
        )
        .map((permission) => permission._id),
      isSystem: true,
      isSuperAdmin: false,
    },
    {
      name: "Compliance Manager",
      slug: "compliance-manager",
      description: "Manages export requirements and trade rules",
      permissionIds: permissions
        .filter(
          (permission) =>
            COMPLIANCE_MANAGER_PERMISSIONS.includes(permission.name) ||
            COMPLIANCE_VERIFICATION_PERMISSIONS.includes(permission.name) ||
            COMPLIANCE_BILLING_PERMISSIONS.includes(permission.name) ||
            COMPLIANCE_DOCUMENTS_PERMISSIONS.includes(permission.name) ||
            COMPLIANCE_PRODUCTS_PERMISSIONS.includes(permission.name) ||
            permission.name === "leads.view"
        )
        .map((permission) => permission._id),
      isSystem: true,
      isSuperAdmin: false,
    },
    {
      name: "Finance",
      slug: "finance",
      description: "Reviews export pricing, landed cost, invoices, and payments",
      permissionIds: permissions
        .filter(
          (permission) =>
            FINANCE_PERMISSIONS.includes(permission.name) ||
            FINANCE_BILLING_PERMISSIONS.includes(permission.name) ||
            FINANCE_PRODUCTS_PERMISSIONS.includes(permission.name) ||
            permission.name === "leads.view"
        )
        .map((permission) => permission._id),
      isSystem: true,
      isSuperAdmin: false,
    },
    {
      name: "Logistics Manager",
      slug: "logistics-manager",
      description: "Manages corridors, routes, and transit performance",
      permissionIds: permissions.filter((permission) => LOGISTICS_MANAGER_PERMISSIONS.includes(permission.name)).map((permission) => permission._id),
      isSystem: true,
      isSuperAdmin: false,
    },
  ];

  const saved = [];
  for (const role of roles) {
    const doc = await Role.findOneAndUpdate(
      { slug: role.slug },
      { $set: { ...role, deletedAt: null } },
      { upsert: true, new: true }
    );
    saved.push(doc);
  }
  return saved;
}

module.exports = { seedRoles };

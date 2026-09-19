const { LEAD_VERIFICATION_STATUSES } = require("./verification");

const PRODUCT_STATUSES = ["draft", "in_verification", "verified", "rejected", "archived"];
const PRODUCT_LISTING_STATUSES = ["unlisted", "listed"];
const PRODUCT_ORIGINS = ["catalog", "migrated"];
const PRODUCT_MEDIA_KINDS = ["photo", "video", "document"];
const PRODUCT_MEDIA_ROLES = ["hero", "gallery", "packaging", "datasheet", "brochure", "other"];
const PRODUCT_MEASUREMENT_DIMENSIONS = ["weight", "volume", "length", "area", "count", "time", "custom"];
const PRODUCT_SHARE_STATUSES = ["shared", "revoked"];
const PRODUCT_VERIFICATION_STATUSES = LEAD_VERIFICATION_STATUSES;

function permission(name, action, description) {
  return { name, module: "products", action, description };
}

const PRODUCTS_PERMISSIONS = [
  permission("products.view", "view", "View the product catalog"),
  permission("products.create", "create", "Create products for verified suppliers"),
  permission("products.update", "update", "Update product drafts and media"),
  permission("products.delete", "delete", "Delete products"),
  permission("products.submit", "submit", "Submit products for verification"),
  permission("products.list", "list", "List and unlist verified products"),
  permission("products.share", "share", "Share listed products with distributors"),
];

const PRODUCTS_PERMISSION_NAMES = PRODUCTS_PERMISSIONS.map((item) => item.name);

const SALES_PRODUCTS_PERMISSIONS = [
  "products.view",
  "products.create",
  "products.update",
  "products.submit",
  "products.share",
];

const COMPLIANCE_PRODUCTS_PERMISSIONS = ["products.view", "products.list", "products.delete"];

const EXPORT_MANAGER_PRODUCTS_PERMISSIONS = ["products.view", "products.share"];

const FINANCE_PRODUCTS_PERMISSIONS = ["products.view"];

module.exports = {
  PRODUCT_STATUSES,
  PRODUCT_LISTING_STATUSES,
  PRODUCT_ORIGINS,
  PRODUCT_MEDIA_KINDS,
  PRODUCT_MEDIA_ROLES,
  PRODUCT_MEASUREMENT_DIMENSIONS,
  PRODUCT_SHARE_STATUSES,
  PRODUCT_VERIFICATION_STATUSES,
  PRODUCTS_PERMISSIONS,
  PRODUCTS_PERMISSION_NAMES,
  SALES_PRODUCTS_PERMISSIONS,
  COMPLIANCE_PRODUCTS_PERMISSIONS,
  EXPORT_MANAGER_PRODUCTS_PERMISSIONS,
  FINANCE_PRODUCTS_PERMISSIONS,
};

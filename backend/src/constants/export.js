const MARKET_STATUSES = [
  "research",
  "target",
  "under_evaluation",
  "approved",
  "active",
  "restricted",
  "suspended",
  "inactive",
];

const CORRIDOR_STATUSES = [
  "draft",
  "cost_review",
  "logistics_review",
  "compliance_review",
  "approved",
  "active",
  "inactive",
  "unavailable",
];

const MAPPING_STATUSES = ["active", "inactive", "restricted", "pending_review"];
const LOOKUP_TYPES = [
  "region",
  "country",
  "port",
  "airport",
  "warehouse",
  "transport_mode",
  "hs_code",
  "currency",
  "cost_component",
  "risk_category",
  "requirement_type",
  "market_type",
  "product_category",
];
const LOOKUP_STATUSES = ["active", "inactive"];
const LOCATION_TYPES = ["origin", "warehouse", "port", "airport", "transit", "destination", "customer"];
const TRANSPORT_MODES = ["road", "rail", "sea", "air", "multimodal"];
const REQUIREMENT_STATUSES = ["draft", "pending", "compliant", "expiring", "expired", "waived"];
const RISK_SCOPES = ["market", "corridor"];
const RISK_SEVERITIES = ["low", "medium", "high", "critical"];
const RISK_STATUSES = ["open", "monitoring", "mitigated", "closed"];
const PRICING_TYPES = ["standard", "customer", "volume", "seasonal", "contract", "promotional"];
const PRICING_STATUSES = ["draft", "active", "expired", "inactive"];
const BUYER_STATUSES = ["prospect", "onboarding", "active", "inactive"];
const OPPORTUNITY_STAGES = [
  "identified",
  "qualified",
  "market_evaluation",
  "product_evaluation",
  "corridor_evaluation",
  "pricing",
  "proposal",
  "negotiation",
  "approved",
  "converted",
  "lost",
];
const SCORE_SCOPES = ["market", "corridor"];
const ALERT_EVENT_TYPES = [
  "requirement_expiring",
  "requirement_expired",
  "market_status_restricted",
  "corridor_unavailable",
  "opportunity_overdue",
  "margin_below_threshold",
  "fx_move",
  "tariff_change",
  "corridor_cost_increase",
];
const RULE_ACTION_TYPES = [
  "require_document",
  "require_certification",
  "set_requirement_type",
  "flag_restricted",
  "notify_role",
];

function permission(name, action, description) {
  return { name, module: "export", action, description };
}

const EXPORT_PERMISSIONS = [
  permission("export.view", "view", "View export dashboard"),
  permission("export.markets.view", "markets.view", "View export markets"),
  permission("export.markets.create", "markets.create", "Create export markets"),
  permission("export.markets.update", "markets.update", "Update export markets"),
  permission("export.markets.delete", "markets.delete", "Delete export markets"),
  permission("export.markets.approve", "markets.approve", "Approve export markets"),
  permission("export.corridors.view", "corridors.view", "View export corridors"),
  permission("export.corridors.create", "corridors.create", "Create export corridors"),
  permission("export.corridors.update", "corridors.update", "Update export corridors"),
  permission("export.corridors.delete", "corridors.delete", "Delete export corridors"),
  permission("export.corridors.compare", "corridors.compare", "Compare export corridors"),
  permission("export.mappings.view", "mappings.view", "View product-market mappings"),
  permission("export.mappings.update", "mappings.update", "Manage product-market mappings"),
  permission("export.buyers.view", "buyers.view", "View export distributors"),
  permission("export.buyers.create", "buyers.create", "Create export distributors"),
  permission("export.buyers.update", "buyers.update", "Update export distributors"),
  permission("export.buyers.delete", "buyers.delete", "Delete export distributors"),
  permission("export.opportunities.view", "opportunities.view", "View export opportunities"),
  permission("export.opportunities.create", "opportunities.create", "Create export opportunities"),
  permission("export.opportunities.update", "opportunities.update", "Update export opportunities"),
  permission("export.opportunities.delete", "opportunities.delete", "Delete export opportunities"),
  permission("export.pricing.view", "pricing.view", "View market pricing"),
  permission("export.pricing.manage", "pricing.manage", "Manage market pricing"),
  permission("export.calculator.view", "calculator.view", "Use landed cost calculator"),
  permission("export.finance.view", "finance.view", "View margins and profitability"),
  permission("export.compliance.view", "compliance.view", "View compliance requirements"),
  permission("export.compliance.manage", "compliance.manage", "Manage compliance and trade rules"),
  permission("export.risks.view", "risks.view", "View market and corridor risks"),
  permission("export.risks.manage", "risks.manage", "Manage market and corridor risks"),
  permission("export.analytics.view", "analytics.view", "View export analytics"),
  permission("export.alerts.view", "alerts.view", "View export alerts"),
  permission("export.alerts.manage", "alerts.manage", "Manage export alert rules"),
  permission("export.settings.view", "settings.view", "View export settings"),
  permission("export.settings.update", "settings.update", "Update export settings"),
];

const EXPORT_PERMISSION_NAMES = EXPORT_PERMISSIONS.map((item) => item.name);

const EXPORT_MANAGER_PERMISSIONS = [
  "export.view",
  "export.markets.view",
  "export.markets.create",
  "export.markets.update",
  "export.markets.delete",
  "export.markets.approve",
  "export.corridors.view",
  "export.corridors.create",
  "export.corridors.update",
  "export.corridors.delete",
  "export.corridors.compare",
  "products.view",
  "products.share",
  "export.mappings.view",
  "export.mappings.update",
  "export.buyers.view",
  "export.buyers.create",
  "export.buyers.update",
  "export.buyers.delete",
  "export.opportunities.view",
  "export.opportunities.create",
  "export.opportunities.update",
  "export.opportunities.delete",
  "export.pricing.view",
  "export.calculator.view",
  "export.finance.view",
  "export.compliance.view",
  "export.risks.view",
  "export.analytics.view",
  "export.alerts.view",
  "export.settings.view",
];

const COMPLIANCE_MANAGER_PERMISSIONS = [
  "export.view",
  "export.markets.view",
  "products.view",
  "export.mappings.view",
  "export.compliance.view",
  "export.compliance.manage",
  "export.alerts.view",
  "export.alerts.manage",
];

const FINANCE_PERMISSIONS = [
  "export.view",
  "export.markets.view",
  "export.corridors.view",
  "products.view",
  "export.pricing.view",
  "export.pricing.manage",
  "export.calculator.view",
  "export.finance.view",
  "export.analytics.view",
];

const LOGISTICS_MANAGER_PERMISSIONS = [
  "export.view",
  "export.markets.view",
  "export.corridors.view",
  "export.corridors.create",
  "export.corridors.update",
  "export.corridors.delete",
  "export.corridors.compare",
  "export.calculator.view",
  "export.risks.view",
  "export.risks.manage",
  "export.settings.view",
];

const DEFAULT_MARKET_FACTORS = [
  { key: "demand", label: "Demand potential", weight: 25, min: 0, max: 100 },
  { key: "profitability", label: "Profitability", weight: 20, min: 0, max: 100 },
  { key: "competition", label: "Competition", weight: 15, min: 0, max: 100 },
  { key: "logistics", label: "Logistics", weight: 15, min: 0, max: 100 },
  { key: "regulatory_ease", label: "Regulatory ease", weight: 10, min: 0, max: 100 },
  { key: "market_growth", label: "Market growth", weight: 10, min: 0, max: 100 },
  { key: "country_risk", label: "Country risk", weight: 5, min: 0, max: 100 },
];

const DEFAULT_CORRIDOR_FACTORS = [
  { key: "cost", label: "Cost", weight: 25, min: 0, max: 100 },
  { key: "transit", label: "Transit time", weight: 20, min: 0, max: 100 },
  { key: "reliability", label: "Reliability", weight: 20, min: 0, max: 100 },
  { key: "capacity", label: "Capacity", weight: 10, min: 0, max: 100 },
  { key: "risk", label: "Risk", weight: 15, min: 0, max: 100 },
  { key: "historical_otd", label: "Historical on-time delivery", weight: 10, min: 0, max: 100 },
];

const DEFAULT_THRESHOLDS = [
  { min: 80, max: 100, label: "Excellent" },
  { min: 60, max: 79, label: "Good" },
  { min: 40, max: 59, label: "Moderate" },
  { min: 0, max: 39, label: "Low" },
];

const DEFAULT_COST_COMPONENTS = [
  { code: "product_cost", name: "Product cost" },
  { code: "packaging", name: "Packaging" },
  { code: "inland_transport", name: "Inland transport" },
  { code: "export_handling", name: "Export handling" },
  { code: "documentation", name: "Documentation" },
  { code: "port_charges", name: "Port charges" },
  { code: "freight", name: "Freight" },
  { code: "insurance", name: "Insurance" },
  { code: "customs", name: "Customs" },
  { code: "duties", name: "Duties" },
  { code: "destination_handling", name: "Destination handling" },
  { code: "warehousing", name: "Warehousing" },
  { code: "last_mile", name: "Last mile" },
  { code: "other", name: "Other charges" },
];

const DEFAULT_INCOTERMS = [
  { code: "EXW", name: "Ex Works", costComponentCodes: ["product_cost", "packaging"] },
  { code: "FCA", name: "Free Carrier", costComponentCodes: ["product_cost", "packaging", "inland_transport", "export_handling", "documentation"] },
  { code: "FOB", name: "Free on Board", costComponentCodes: ["product_cost", "packaging", "inland_transport", "export_handling", "documentation", "port_charges"] },
  { code: "CFR", name: "Cost and Freight", costComponentCodes: ["product_cost", "packaging", "inland_transport", "export_handling", "documentation", "port_charges", "freight"] },
  {
    code: "CIF",
    name: "Cost, Insurance and Freight",
    costComponentCodes: ["product_cost", "packaging", "inland_transport", "export_handling", "documentation", "port_charges", "freight", "insurance"],
  },
  { code: "CPT", name: "Carriage Paid To", costComponentCodes: ["product_cost", "packaging", "inland_transport", "export_handling", "documentation", "freight"] },
  { code: "CIP", name: "Carriage and Insurance Paid To", costComponentCodes: ["product_cost", "packaging", "inland_transport", "export_handling", "documentation", "freight", "insurance"] },
  {
    code: "DAP",
    name: "Delivered at Place",
    costComponentCodes: [
      "product_cost",
      "packaging",
      "inland_transport",
      "export_handling",
      "documentation",
      "port_charges",
      "freight",
      "insurance",
      "destination_handling",
      "warehousing",
    ],
  },
  {
    code: "DDP",
    name: "Delivered Duty Paid",
    costComponentCodes: DEFAULT_COST_COMPONENTS.map((item) => item.code),
  },
];

module.exports = {
  MARKET_STATUSES,
  CORRIDOR_STATUSES,
  MAPPING_STATUSES,
  LOOKUP_TYPES,
  LOOKUP_STATUSES,
  LOCATION_TYPES,
  TRANSPORT_MODES,
  REQUIREMENT_STATUSES,
  RISK_SCOPES,
  RISK_SEVERITIES,
  RISK_STATUSES,
  PRICING_TYPES,
  PRICING_STATUSES,
  BUYER_STATUSES,
  OPPORTUNITY_STAGES,
  SCORE_SCOPES,
  ALERT_EVENT_TYPES,
  RULE_ACTION_TYPES,
  EXPORT_PERMISSIONS,
  EXPORT_PERMISSION_NAMES,
  EXPORT_MANAGER_PERMISSIONS,
  COMPLIANCE_MANAGER_PERMISSIONS,
  FINANCE_PERMISSIONS,
  LOGISTICS_MANAGER_PERMISSIONS,
  DEFAULT_MARKET_FACTORS,
  DEFAULT_CORRIDOR_FACTORS,
  DEFAULT_THRESHOLDS,
  DEFAULT_COST_COMPONENTS,
  DEFAULT_INCOTERMS,
};

export const MARKET_STATUSES = [
  { value: "research", label: "Research" },
  { value: "target", label: "Target" },
  { value: "under_evaluation", label: "Under evaluation" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "restricted", label: "Restricted" },
  { value: "suspended", label: "Suspended" },
  { value: "inactive", label: "Inactive" },
];

export const CORRIDOR_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "cost_review", label: "Cost review" },
  { value: "logistics_review", label: "Logistics review" },
  { value: "compliance_review", label: "Compliance review" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "unavailable", label: "Unavailable" },
];

export const MAPPING_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "restricted", label: "Restricted" },
  { value: "pending_review", label: "Pending review" },
];

export const TRANSPORT_MODES = [
  { value: "road", label: "Road" },
  { value: "rail", label: "Rail" },
  { value: "sea", label: "Sea" },
  { value: "air", label: "Air" },
  { value: "multimodal", label: "Multimodal" },
];

export const LOCATION_TYPES = [
  { value: "origin", label: "Origin" },
  { value: "warehouse", label: "Warehouse / Hub" },
  { value: "port", label: "Port" },
  { value: "airport", label: "Airport" },
  { value: "transit", label: "Transit point" },
  { value: "destination", label: "Destination" },
  { value: "customer", label: "Customer" },
];

export const REQUIREMENT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "compliant", label: "Compliant" },
  { value: "expiring", label: "Expiring" },
  { value: "expired", label: "Expired" },
  { value: "waived", label: "Waived" },
];

export const RISK_SEVERITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export const RISK_STATUSES = [
  { value: "open", label: "Open" },
  { value: "monitoring", label: "Monitoring" },
  { value: "mitigated", label: "Mitigated" },
  { value: "closed", label: "Closed" },
];

export const BUYER_STATUSES = [
  { value: "prospect", label: "Prospect" },
  { value: "onboarding", label: "Onboarding" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const OPPORTUNITY_STAGES = [
  { value: "identified", label: "Identified" },
  { value: "qualified", label: "Qualified" },
  { value: "market_evaluation", label: "Market evaluation" },
  { value: "product_evaluation", label: "Product evaluation" },
  { value: "corridor_evaluation", label: "Corridor evaluation" },
  { value: "pricing", label: "Pricing" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "approved", label: "Approved" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

export const PRICING_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "customer", label: "Customer" },
  { value: "volume", label: "Volume" },
  { value: "seasonal", label: "Seasonal" },
  { value: "contract", label: "Contract" },
  { value: "promotional", label: "Promotional" },
];

export const PRICING_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "inactive", label: "Inactive" },
];

export const LOOKUP_TYPES = [
  { value: "region", label: "Regions" },
  { value: "country", label: "Countries" },
  { value: "port", label: "Ports" },
  { value: "airport", label: "Airports" },
  { value: "warehouse", label: "Warehouses" },
  { value: "transport_mode", label: "Transport modes" },
  { value: "hs_code", label: "HS codes" },
  { value: "currency", label: "Currencies" },
  { value: "cost_component", label: "Cost components" },
  { value: "risk_category", label: "Risk categories" },
  { value: "requirement_type", label: "Requirement types" },
  { value: "market_type", label: "Market types" },
  { value: "product_category", label: "Product categories" },
];

export const RULE_ACTION_TYPES = [
  { value: "require_document", label: "Require document" },
  { value: "require_certification", label: "Require certification" },
  { value: "set_requirement_type", label: "Set requirement type" },
  { value: "flag_restricted", label: "Flag restricted" },
  { value: "notify_role", label: "Notify role" },
];

export const ALERT_EVENT_TYPES = [
  { value: "requirement_expiring", label: "Requirement expiring" },
  { value: "requirement_expired", label: "Requirement expired" },
  { value: "market_status_restricted", label: "Market restricted" },
  { value: "corridor_unavailable", label: "Corridor unavailable" },
  { value: "opportunity_overdue", label: "Opportunity overdue" },
  { value: "margin_below_threshold", label: "Margin below threshold" },
  { value: "fx_move", label: "Currency move" },
  { value: "tariff_change", label: "Tariff change" },
  { value: "corridor_cost_increase", label: "Corridor cost increase" },
];

export function labelFor(list, value) {
  return list.find((item) => item.value === value)?.label || value || "—";
}

export function statusVariant(status) {
  if (["active", "approved", "converted", "compliant", "mitigated"].includes(status)) return "success";
  if (["restricted", "suspended", "unavailable", "expired", "lost", "critical"].includes(status)) return "danger";
  if (["under_evaluation", "pending", "expiring", "cost_review", "high", "onboarding"].includes(status)) return "warning";
  if (["target", "qualified", "proposal", "negotiation"].includes(status)) return "primary";
  return "default";
}

export function scoreVariant(score) {
  if (score >= 80) return "success";
  if (score >= 60) return "primary";
  if (score >= 40) return "warning";
  return "danger";
}

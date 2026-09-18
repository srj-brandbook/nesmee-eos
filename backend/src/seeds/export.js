const ExportLookup = require("../models/ExportLookup");
const ExportIncoterm = require("../models/ExportIncoterm");
const ExportScoreProfile = require("../models/ExportScoreProfile");
const ExportSettings = require("../models/ExportSettings");
const ExportFxRate = require("../models/ExportFxRate");
const ExportAlertRule = require("../models/ExportAlertRule");
const {
  DEFAULT_COST_COMPONENTS,
  DEFAULT_INCOTERMS,
  DEFAULT_MARKET_FACTORS,
  DEFAULT_CORRIDOR_FACTORS,
  DEFAULT_THRESHOLDS,
} = require("../constants/export");

const LOOKUPS = [
  { type: "region", code: "MEA", name: "Middle East & Africa" },
  { type: "region", code: "EU", name: "Europe" },
  { type: "region", code: "NA", name: "North America" },
  { type: "region", code: "APAC", name: "Asia Pacific" },
  { type: "country", code: "IN", name: "India", metadata: { currency: "INR", region: "APAC" } },
  { type: "country", code: "AE", name: "United Arab Emirates", metadata: { currency: "AED", region: "MEA" } },
  { type: "country", code: "SA", name: "Saudi Arabia", metadata: { currency: "SAR", region: "MEA" } },
  { type: "country", code: "DE", name: "Germany", metadata: { currency: "EUR", region: "EU" } },
  { type: "country", code: "US", name: "United States", metadata: { currency: "USD", region: "NA" } },
  { type: "country", code: "GB", name: "United Kingdom", metadata: { currency: "GBP", region: "EU" } },
  { type: "country", code: "SG", name: "Singapore", metadata: { currency: "SGD", region: "APAC" } },
  { type: "port", code: "INCOK", name: "Cochin Port", countryCode: "IN" },
  { type: "port", code: "INMUN", name: "Mundra Port", countryCode: "IN" },
  { type: "port", code: "INNSA", name: "Nhava Sheva (JNPT)", countryCode: "IN" },
  { type: "port", code: "AEJEA", name: "Jebel Ali", countryCode: "AE" },
  { type: "port", code: "DEHAM", name: "Hamburg", countryCode: "DE" },
  { type: "airport", code: "COK", name: "Cochin Airport", countryCode: "IN" },
  { type: "airport", code: "DXB", name: "Dubai Airport", countryCode: "AE" },
  { type: "airport", code: "FRA", name: "Frankfurt Airport", countryCode: "DE" },
  { type: "warehouse", code: "COK-WH", name: "Cochin Export Warehouse", countryCode: "IN" },
  { type: "warehouse", code: "DXB-WH", name: "Dubai Destination Warehouse", countryCode: "AE" },
  { type: "transport_mode", code: "ROAD", name: "Road" },
  { type: "transport_mode", code: "RAIL", name: "Rail" },
  { type: "transport_mode", code: "SEA", name: "Sea" },
  { type: "transport_mode", code: "AIR", name: "Air" },
  { type: "transport_mode", code: "MULTIMODAL", name: "Multimodal" },
  { type: "currency", code: "INR", name: "Indian Rupee" },
  { type: "currency", code: "USD", name: "US Dollar" },
  { type: "currency", code: "AED", name: "UAE Dirham" },
  { type: "currency", code: "EUR", name: "Euro" },
  { type: "currency", code: "GBP", name: "British Pound" },
  { type: "hs_code", code: "0901", name: "Coffee" },
  { type: "hs_code", code: "0902", name: "Tea" },
  { type: "hs_code", code: "0801", name: "Coconuts, brazil nuts and cashew nuts" },
  { type: "product_category", code: "FOOD", name: "Food" },
  { type: "product_category", code: "SPICE", name: "Spices" },
  { type: "product_category", code: "TEXTILE", name: "Textiles" },
  { type: "market_type", code: "COUNTRY", name: "Country" },
  { type: "market_type", code: "REGION", name: "Region" },
  { type: "requirement_type", code: "import_license", name: "Import license" },
  { type: "requirement_type", code: "product_registration", name: "Product registration" },
  { type: "requirement_type", code: "coo", name: "Certificate of origin" },
  { type: "requirement_type", code: "health", name: "Health certificate" },
  { type: "requirement_type", code: "phytosanitary", name: "Phytosanitary certificate" },
  { type: "requirement_type", code: "inspection", name: "Inspection certificate" },
  { type: "requirement_type", code: "packaging", name: "Packaging certificate" },
  { type: "requirement_type", code: "testing", name: "Product testing" },
  { type: "requirement_type", code: "label_approval", name: "Label approval" },
  { type: "requirement_type", code: "customs_doc", name: "Customs documentation" },
  { type: "risk_category", code: "political", name: "Political risk" },
  { type: "risk_category", code: "economic", name: "Economic risk" },
  { type: "risk_category", code: "currency", name: "Currency risk" },
  { type: "risk_category", code: "regulatory", name: "Regulatory risk" },
  { type: "risk_category", code: "trade_restriction", name: "Trade restriction" },
  { type: "risk_category", code: "payment", name: "Payment risk" },
  { type: "risk_category", code: "demand", name: "Demand risk" },
  { type: "risk_category", code: "competition", name: "Competition risk" },
  { type: "risk_category", code: "port_congestion", name: "Port congestion" },
  { type: "risk_category", code: "shipping_disruption", name: "Shipping disruption" },
  { type: "risk_category", code: "customs_delay", name: "Customs delay" },
  { type: "risk_category", code: "carrier", name: "Carrier reliability" },
  { type: "risk_category", code: "weather", name: "Weather" },
  { type: "risk_category", code: "geopolitical", name: "Geopolitical risk" },
  { type: "risk_category", code: "infrastructure", name: "Infrastructure risk" },
  { type: "risk_category", code: "transit_variability", name: "Transit variability" },
];

async function seedExport() {
  for (const [index, item] of LOOKUPS.entries()) {
    await ExportLookup.updateOne(
      { type: item.type, code: item.code, deletedAt: null },
      { $set: { ...item, status: "active", sortOrder: index, deletedAt: null } },
      { upsert: true }
    );
  }

  for (const [index, item] of DEFAULT_COST_COMPONENTS.entries()) {
    await ExportLookup.updateOne(
      { type: "cost_component", code: item.code.toUpperCase(), deletedAt: null },
      { $set: { type: "cost_component", code: item.code, name: item.name, status: "active", sortOrder: index, deletedAt: null } },
      { upsert: true }
    );
  }

  for (const item of DEFAULT_INCOTERMS) {
    await ExportIncoterm.updateOne(
      { code: item.code, deletedAt: null },
      { $set: { ...item, status: "active", deletedAt: null } },
      { upsert: true }
    );
  }

  await ExportScoreProfile.updateOne(
    { scope: "market", name: "Default market score", deletedAt: null },
    { $set: { scope: "market", name: "Default market score", factors: DEFAULT_MARKET_FACTORS, thresholds: DEFAULT_THRESHOLDS, status: "active", deletedAt: null } },
    { upsert: true }
  );
  await ExportScoreProfile.updateOne(
    { scope: "corridor", name: "Default corridor score", deletedAt: null },
    { $set: { scope: "corridor", name: "Default corridor score", factors: DEFAULT_CORRIDOR_FACTORS, thresholds: DEFAULT_THRESHOLDS, status: "active", deletedAt: null } },
    { upsert: true }
  );

  await ExportSettings.findOneAndUpdate({ key: "export" }, { $setOnInsert: { key: "export", baseCurrency: "INR", originCountryCode: "IN", defaultIncoterm: "FOB" } }, { upsert: true });

  const today = new Date();
  const fx = [
    { base: "INR", quote: "USD", rate: 0.012 },
    { base: "INR", quote: "AED", rate: 0.044 },
    { base: "INR", quote: "EUR", rate: 0.011 },
    { base: "USD", quote: "INR", rate: 83 },
    { base: "AED", quote: "INR", rate: 22.6 },
    { base: "EUR", quote: "INR", rate: 90 },
  ];
  for (const item of fx) {
    const exists = await ExportFxRate.findOne({ base: item.base, quote: item.quote, deletedAt: null });
    if (!exists) await ExportFxRate.create({ ...item, rateDate: today, source: "seed", bufferPct: 1, riskAdjustmentPct: 0 });
  }

  const alerts = [
    { name: "Requirement expiring", eventType: "requirement_expiring", notifyRoleSlugs: ["compliance-manager", "export-manager"] },
    { name: "Requirement expired", eventType: "requirement_expired", notifyRoleSlugs: ["compliance-manager", "export-manager"] },
    { name: "Market restricted", eventType: "market_status_restricted", notifyRoleSlugs: ["export-manager"] },
    { name: "Corridor unavailable", eventType: "corridor_unavailable", notifyRoleSlugs: ["logistics-manager", "export-manager"] },
    { name: "Opportunity overdue", eventType: "opportunity_overdue", notifyRoleSlugs: ["export-manager"] },
  ];
  for (const item of alerts) {
    await ExportAlertRule.updateOne(
      { eventType: item.eventType, deletedAt: null },
      { $set: { ...item, enabled: true, deletedAt: null } },
      { upsert: true }
    );
  }
}

module.exports = { seedExport };

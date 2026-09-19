const Joi = require("joi");
const {
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
} = require("../../constants/export");

const objectId = Joi.string().hex().length(24);
const pagination = {
  search: Joi.string().allow(""),
  sort: Joi.string(),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
};

const idParam = Joi.object({ params: Joi.object({ id: objectId.required() }).required() });
const marketParam = Joi.object({ params: Joi.object({ id: objectId.required() }).required() });
const nestedParam = Joi.object({
  params: Joi.object({ id: objectId.required(), nestedId: objectId.required() }).required(),
});

const listQuery = (extra = {}) => Joi.object({ query: Joi.object({ ...pagination, ...extra }) });

const lookupBody = {
  type: Joi.string().valid(...LOOKUP_TYPES),
  code: Joi.string().trim().max(40),
  name: Joi.string().trim().max(160),
  parentCode: Joi.string().trim().allow(""),
  countryCode: Joi.string().trim().allow(""),
  metadata: Joi.object().unknown(true),
  status: Joi.string().valid(...LOOKUP_STATUSES),
  sortOrder: Joi.number(),
};

const incotermBody = {
  code: Joi.string().trim().max(8),
  name: Joi.string().trim().max(120),
  costComponentCodes: Joi.array().items(Joi.string()),
  status: Joi.string().valid("active", "inactive"),
  notes: Joi.string().allow(""),
};

const factor = Joi.object({
  key: Joi.string().required(),
  label: Joi.string().required(),
  weight: Joi.number().min(0).max(100).required(),
  min: Joi.number(),
  max: Joi.number(),
});

const scoreBody = {
  scope: Joi.string().valid(...SCORE_SCOPES),
  name: Joi.string().trim().max(160),
  factors: Joi.array().items(factor),
  thresholds: Joi.array().items(Joi.object({ min: Joi.number().required(), max: Joi.number().required(), label: Joi.string().required() })),
  status: Joi.string().valid("active", "inactive"),
};

const fxBody = {
  base: Joi.string().trim().max(8),
  quote: Joi.string().trim().max(8),
  rate: Joi.number().min(0),
  rateDate: Joi.date(),
  source: Joi.string().allow(""),
  bufferPct: Joi.number(),
  riskAdjustmentPct: Joi.number(),
};

const marketBody = {
  name: Joi.string().trim().min(2).max(160),
  countryCode: Joi.string().trim().max(8),
  countryName: Joi.string().trim().allow(""),
  regionCode: Joi.string().trim().allow(""),
  currencyCode: Joi.string().trim().allow(""),
  timeZone: Joi.string().trim().allow(""),
  language: Joi.string().trim().allow(""),
  status: Joi.string().valid(...MARKET_STATUSES),
  marketType: Joi.string().trim().allow(""),
  targetSegment: Joi.string().trim().allow(""),
  marketSize: Joi.number().min(0),
  estimatedDemand: Joi.number().min(0),
  expectedAnnualVolume: Joi.number().min(0),
  targetRevenue: Joi.number().min(0),
  expectedMargin: Joi.number(),
  growthPotential: Joi.number().min(0).max(100),
  description: Joi.string().allow(""),
  notes: Joi.string().allow(""),
  ownerId: objectId.allow(null, ""),
  managerId: objectId.allow(null, ""),
  customFields: Joi.object().unknown(true),
};

const mappingBody = {
  productId: objectId,
  hsCode: Joi.string().allow(""),
  eligibilityStatus: Joi.string().valid(...MAPPING_STATUSES),
  minOrderQty: Joi.number().min(0),
  maxQty: Joi.number().min(0),
  targetPrice: Joi.number().min(0),
  minPrice: Joi.number().min(0),
  currency: Joi.string().allow(""),
  incotermCode: Joi.string().allow(""),
  tariffRate: Joi.number(),
  dutyRate: Joi.number(),
  requiredCertifications: Joi.string().allow(""),
  packagingRequirements: Joi.string().allow(""),
  labelRequirements: Joi.string().allow(""),
  testingRequirements: Joi.string().allow(""),
  shelfLifeDays: Joi.number().min(0),
  importRestrictions: Joi.string().allow(""),
  notes: Joi.string().allow(""),
  effectiveFrom: Joi.date().allow(null),
  effectiveUntil: Joi.date().allow(null),
};

const segment = Joi.object({
  key: Joi.string().allow(""),
  sequence: Joi.number(),
  locationType: Joi.string().valid(...LOCATION_TYPES),
  locationId: objectId.allow(null, ""),
  locationLabel: Joi.string().allow(""),
  mode: Joi.string().valid(...TRANSPORT_MODES, ""),
  carrier: Joi.string().allow(""),
  transitMinDays: Joi.number().min(0),
  transitAvgDays: Joi.number().min(0),
  transitMaxDays: Joi.number().min(0),
  costAmount: Joi.number().min(0),
  costCurrency: Joi.string().allow(""),
  costComponentCode: Joi.string().allow(""),
  riskScore: Joi.number().min(0).max(100),
  notes: Joi.string().allow(""),
});

const corridorBody = {
  name: Joi.string().trim().min(2).max(160),
  code: Joi.string().trim().allow(""),
  marketId: objectId,
  originCountryCode: Joi.string().allow(""),
  originState: Joi.string().allow(""),
  originCity: Joi.string().allow(""),
  originLocationId: objectId.allow(null, ""),
  destCountryCode: Joi.string().allow(""),
  destCity: Joi.string().allow(""),
  destLocationId: objectId.allow(null, ""),
  primaryMode: Joi.string().valid(...TRANSPORT_MODES),
  secondaryMode: Joi.string().valid(...TRANSPORT_MODES, ""),
  status: Joi.string().valid(...CORRIDOR_STATUSES),
  priority: Joi.number(),
  isPrimary: Joi.boolean(),
  ownerId: objectId.allow(null, ""),
  reliability: Joi.number().min(0).max(100),
  capacity: Joi.number().min(0),
  notes: Joi.string().allow(""),
  segments: Joi.array().items(segment),
  costs: Joi.array().items(
    Joi.object({
      componentCode: Joi.string().required(),
      nameSnapshot: Joi.string().allow(""),
      amount: Joi.number().min(0),
      currency: Joi.string().allow(""),
      notes: Joi.string().allow(""),
    })
  ),
};

const requirementBody = {
  name: Joi.string().trim().min(2).max(160),
  marketId: objectId,
  productId: objectId.allow(null, ""),
  productCategory: Joi.string().allow(""),
  requirementType: Joi.string().allow(""),
  mandatory: Joi.boolean(),
  effectiveDate: Joi.date().allow(null),
  expiryDate: Joi.date().allow(null),
  documentRequired: Joi.boolean(),
  responsibleRole: Joi.string().allow(""),
  responsibleUserId: objectId.allow(null, ""),
  status: Joi.string().valid(...REQUIREMENT_STATUSES),
  notes: Joi.string().allow(""),
};

const riskBody = {
  scopeType: Joi.string().valid(...RISK_SCOPES),
  scopeId: objectId,
  riskType: Joi.string().trim(),
  score: Joi.number().min(0).max(100),
  severity: Joi.string().valid(...RISK_SEVERITIES),
  probability: Joi.number().min(0).max(100),
  impact: Joi.number().min(0).max(100),
  mitigation: Joi.string().allow(""),
  ownerId: objectId.allow(null, ""),
  status: Joi.string().valid(...RISK_STATUSES),
  reviewDate: Joi.date().allow(null),
  notes: Joi.string().allow(""),
};

const buyerBody = {
  name: Joi.string().trim().min(2).max(160),
  legalName: Joi.string().allow(""),
  marketId: objectId.allow(null, ""),
  segment: Joi.string().allow(""),
  email: Joi.string().email().allow(""),
  phone: Joi.string().allow(""),
  country: Joi.string().allow(""),
  city: Joi.string().allow(""),
  productInterest: Joi.string().allow(""),
  productIds: Joi.array().items(objectId),
  annualPotential: Joi.number().min(0),
  priceExpectation: Joi.number().min(0),
  paymentTerms: Joi.string().allow(""),
  creditRisk: Joi.number().min(0).max(100),
  ownerId: objectId.allow(null, ""),
  status: Joi.string().valid(...BUYER_STATUSES),
  notes: Joi.string().allow(""),
};

const opportunityBody = {
  title: Joi.string().trim().min(2).max(200),
  marketId: objectId.allow(null, ""),
  productId: objectId.allow(null, ""),
  buyerId: objectId.allow(null, ""),
  corridorId: objectId.allow(null, ""),
  expectedVolume: Joi.number().min(0),
  expectedRevenue: Joi.number().min(0),
  expectedMargin: Joi.number(),
  probability: Joi.number().min(0).max(100),
  expectedShipmentDate: Joi.date().allow(null),
  incotermCode: Joi.string().allow(""),
  currency: Joi.string().allow(""),
  stage: Joi.string().valid(...OPPORTUNITY_STAGES),
  ownerId: objectId.allow(null, ""),
  nextAction: Joi.string().allow(""),
  nextActionAt: Joi.date().allow(null),
  lostReason: Joi.string().allow(""),
  notes: Joi.string().allow(""),
};

const pricingBody = {
  productId: objectId,
  marketId: objectId,
  buyerId: objectId.allow(null, ""),
  currency: Joi.string().allow(""),
  basePrice: Joi.number().min(0),
  minPrice: Joi.number().min(0),
  targetPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  incotermCode: Joi.string().allow(""),
  volumeMin: Joi.number().min(0),
  volumeMax: Joi.number().min(0),
  pricingType: Joi.string().valid(...PRICING_TYPES),
  effectiveFrom: Joi.date().allow(null),
  effectiveUntil: Joi.date().allow(null),
  status: Joi.string().valid(...PRICING_STATUSES),
  notes: Joi.string().allow(""),
};

const performanceBody = {
  periodStart: Joi.date(),
  periodEnd: Joi.date(),
  plannedTransitDays: Joi.number().min(0),
  actualTransitDays: Joi.number().min(0),
  plannedCost: Joi.number().min(0),
  actualCost: Joi.number().min(0),
  plannedMargin: Joi.number(),
  actualMargin: Joi.number(),
  onTimeDeliveryPct: Joi.number().min(0).max(100),
  damagePct: Joi.number().min(0).max(100),
  customsDelayPct: Joi.number().min(0).max(100),
  shipmentVolume: Joi.number().min(0),
  revenue: Joi.number().min(0),
  profit: Joi.number(),
  currency: Joi.string().allow(""),
  notes: Joi.string().allow(""),
};

const condition = Joi.object({
  id: Joi.string().allow(""),
  field: Joi.string().required(),
  operator: Joi.string().required(),
  value: Joi.any(),
  valueType: Joi.string().allow(""),
}).unknown(true);

const ruleBody = {
  name: Joi.string().trim().min(2).max(160),
  enabled: Joi.boolean(),
  priority: Joi.number(),
  effectiveFrom: Joi.date().allow(null),
  effectiveUntil: Joi.date().allow(null),
  conditionGroup: Joi.object({
    operator: Joi.string().valid("AND", "OR"),
    conditions: Joi.array().items(condition),
    groups: Joi.array().items(Joi.object().unknown(true)),
  }).unknown(true),
  actions: Joi.array().items(Joi.object({ type: Joi.string().valid(...RULE_ACTION_TYPES).required(), payload: Joi.object().unknown(true) })),
  notes: Joi.string().allow(""),
};

const alertRuleBody = {
  name: Joi.string().trim().min(2).max(160),
  eventType: Joi.string().valid(...ALERT_EVENT_TYPES),
  enabled: Joi.boolean(),
  threshold: Joi.number(),
  notifyRoleSlugs: Joi.array().items(Joi.string()),
  userIds: Joi.array().items(objectId),
  titleTemplate: Joi.string().allow(""),
  bodyTemplate: Joi.string().allow(""),
};

const create = (body, required = []) => {
  const schema = { ...body };
  required.forEach((key) => {
    schema[key] = schema[key].required();
  });
  return Joi.object({ body: Joi.object(schema).required() });
};

const update = (body) => Joi.object({ params: Joi.object({ id: objectId.required() }).required(), body: Joi.object(body).required() });

module.exports = {
  idParam,
  marketParam,
  nestedParam,
  listLookups: listQuery({ type: Joi.string().valid(...LOOKUP_TYPES), status: Joi.string().valid(...LOOKUP_STATUSES), countryCode: Joi.string() }),
  createLookup: create(lookupBody, ["type", "code", "name"]),
  updateLookup: update(lookupBody),
  listIncoterms: listQuery({ status: Joi.string() }),
  createIncoterm: create(incotermBody, ["code", "name"]),
  updateIncoterm: update(incotermBody),
  listScoreProfiles: listQuery({ scope: Joi.string().valid(...SCORE_SCOPES) }),
  createScoreProfile: create(scoreBody, ["scope", "name"]),
  updateScoreProfile: update(scoreBody),
  listFxRates: listQuery({ base: Joi.string(), quote: Joi.string() }),
  createFxRate: create(fxBody, ["base", "quote", "rate", "rateDate"]),
  updateFxRate: update(fxBody),
  updateSettings: Joi.object({
    body: Joi.object({
      baseCurrency: Joi.string(),
      originCountryCode: Joi.string(),
      defaultIncoterm: Joi.string(),
      marginAlertThreshold: Joi.number(),
      requirementExpiryDays: Joi.number(),
    }).required(),
  }),
  listMarkets: listQuery({
    status: Joi.string().valid(...MARKET_STATUSES),
    region: Joi.string(),
    ownerId: objectId,
    marketType: Joi.string(),
    countryCode: Joi.string(),
  }),
  createMarket: create(marketBody, ["name", "countryCode"]),
  updateMarket: update(marketBody),
  evaluateMarket: Joi.object({
    params: Joi.object({ id: objectId.required() }).required(),
    body: Joi.object({ breakdown: Joi.object().unknown(true), scoreBreakdown: Joi.object().unknown(true), riskScore: Joi.number() }),
  }),
  compareMarkets: Joi.object({ body: Joi.object({ ids: Joi.array().items(objectId).min(2).required() }).required() }),
  listMappings: listQuery({ marketId: objectId, productId: objectId, eligibilityStatus: Joi.string().valid(...MAPPING_STATUSES) }),
  createMapping: Joi.object({
    params: Joi.object({ id: objectId.required() }).required(),
    body: Joi.object({ ...mappingBody, productId: objectId.required() }).required(),
  }),
  updateMapping: Joi.object({
    params: Joi.object({ id: objectId.required(), nestedId: objectId.required() }).required(),
    body: Joi.object(mappingBody).required(),
  }),
  listCorridors: listQuery({
    marketId: objectId,
    status: Joi.string().valid(...CORRIDOR_STATUSES),
    primaryMode: Joi.string().valid(...TRANSPORT_MODES),
    originCountryCode: Joi.string(),
    destCountryCode: Joi.string(),
  }),
  createCorridor: create(corridorBody, ["name", "marketId"]),
  updateCorridor: update(corridorBody),
  compareCorridors: Joi.object({ body: Joi.object({ corridorIds: Joi.array().items(objectId).min(2).required() }).required() }),
  calculate: Joi.object({
    body: Joi.object({
      productId: objectId.allow(null, ""),
      marketId: objectId.allow(null, ""),
      corridorId: objectId.allow(null, ""),
      buyerId: objectId.allow(null, ""),
      opportunityId: objectId.allow(null, ""),
      quantity: Joi.number().min(0),
      unitPrice: Joi.number().min(0),
      sellingPrice: Joi.number().min(0),
      incotermCode: Joi.string().allow(""),
      currency: Joi.string().allow(""),
      save: Joi.boolean(),
      lines: Joi.array().items(
        Joi.object({
          componentCode: Joi.string().required(),
          name: Joi.string().allow(""),
          amount: Joi.number().min(0),
          currency: Joi.string().allow(""),
          notes: Joi.string().allow(""),
        })
      ),
    }).required(),
  }),
  listRequirements: listQuery({
    marketId: objectId,
    productId: objectId,
    status: Joi.string().valid(...REQUIREMENT_STATUSES),
    requirementType: Joi.string(),
  }),
  createRequirement: create(requirementBody, ["name", "marketId"]),
  updateRequirement: update(requirementBody),
  listRules: listQuery({ enabled: Joi.string().valid("true", "false") }),
  createRule: create(ruleBody, ["name"]),
  updateRule: update(ruleBody),
  testRule: Joi.object({
    params: Joi.object({ id: objectId.required() }).required(),
    body: Joi.object({ facts: Joi.object().unknown(true) }),
  }),
  listRisks: listQuery({
    scopeType: Joi.string().valid(...RISK_SCOPES),
    scopeId: objectId,
    status: Joi.string().valid(...RISK_STATUSES),
    severity: Joi.string().valid(...RISK_SEVERITIES),
  }),
  createRisk: create(riskBody, ["scopeType", "scopeId", "riskType"]),
  updateRisk: update(riskBody),
  listBuyers: listQuery({ marketId: objectId, status: Joi.string().valid(...BUYER_STATUSES), ownerId: objectId }),
  createBuyer: create(buyerBody, ["name"]),
  updateBuyer: update(buyerBody),
  listOpportunities: listQuery({
    stage: Joi.string().valid(...OPPORTUNITY_STAGES),
    marketId: objectId,
    productId: objectId,
    buyerId: objectId,
    corridorId: objectId,
    ownerId: objectId,
    board: Joi.string(),
  }),
  createOpportunity: create(opportunityBody, ["title"]),
  updateOpportunity: update(opportunityBody),
  stageOpportunity: Joi.object({
    params: Joi.object({ id: objectId.required() }).required(),
    body: Joi.object({ stage: Joi.string().valid(...OPPORTUNITY_STAGES).required(), lostReason: Joi.string().allow(""), notes: Joi.string().allow("") }),
  }),
  listPricing: listQuery({
    marketId: objectId,
    productId: objectId,
    buyerId: objectId,
    status: Joi.string().valid(...PRICING_STATUSES),
    pricingType: Joi.string().valid(...PRICING_TYPES),
  }),
  createPricing: create(pricingBody, ["productId", "marketId"]),
  updatePricing: update(pricingBody),
  listPerformance: listQuery({}),
  createPerformance: Joi.object({
    params: Joi.object({ id: objectId.required() }).required(),
    body: Joi.object({ ...performanceBody, periodStart: Joi.date().required(), periodEnd: Joi.date().required() }).required(),
  }),
  updatePerformance: Joi.object({
    params: Joi.object({ id: objectId.required(), nestedId: objectId.required() }).required(),
    body: Joi.object(performanceBody).required(),
  }),
  listAlerts: listQuery({ unread: Joi.string(), eventType: Joi.string().valid(...ALERT_EVENT_TYPES) }),
  createAlertRule: create(alertRuleBody, ["name", "eventType"]),
  updateAlertRule: update(alertRuleBody),
  analyticsQuery: Joi.object({
    query: Joi.object({
      ...pagination,
      marketId: objectId,
      productId: objectId,
      buyerId: objectId,
      corridorId: objectId,
      status: Joi.string(),
      country: Joi.string(),
      region: Joi.string(),
      from: Joi.date(),
      to: Joi.date(),
    }),
  }),
};

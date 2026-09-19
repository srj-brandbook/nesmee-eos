function idOf(value) {
  if (!value) return null;
  if (typeof value === "object") return String(value._id || value.id);
  return String(value);
}

function serializePerson(value) {
  if (!value || typeof value !== "object" || !value.name) return null;
  return {
    id: String(value._id || value.id),
    name: value.name,
    email: value.email || "",
    avatarUrl: value.avatarUrl || "",
  };
}

function serializeRef(value, extra = {}) {
  if (!value || typeof value !== "object") return null;
  const id = value._id || value.id;
  if (!id) return null;
  return { id: String(id), name: value.name || value.title || "", ...extra };
}

function stripFinance(doc, hideFinance) {
  if (!hideFinance) return doc;
  const clone = { ...doc };
  delete clone.expectedMargin;
  delete clone.targetRevenue;
  delete clone.baseCost;
  delete clone.targetPrice;
  delete clone.minPrice;
  delete clone.maxPrice;
  delete clone.basePrice;
  delete clone.grossProfit;
  delete clone.grossMarginPct;
  delete clone.landedCost;
  delete clone.profit;
  delete clone.actualMargin;
  delete clone.plannedMargin;
  if (clone.scoreBreakdown) clone.scoreBreakdown = {};
  return clone;
}

function serializeLookup(item) {
  const source = item.toObject ? item.toObject() : item;
  return {
    id: String(source._id),
    type: source.type,
    code: source.code,
    name: source.name,
    parentCode: source.parentCode || "",
    countryCode: source.countryCode || "",
    metadata: source.metadata || {},
    status: source.status,
    sortOrder: source.sortOrder || 0,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeIncoterm(item) {
  const source = item.toObject ? item.toObject() : item;
  return {
    id: String(source._id),
    code: source.code,
    name: source.name,
    costComponentCodes: source.costComponentCodes || [],
    status: source.status,
    notes: source.notes || "",
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeScoreProfile(item) {
  const source = item.toObject ? item.toObject() : item;
  return {
    id: String(source._id),
    scope: source.scope,
    name: source.name,
    factors: source.factors || [],
    thresholds: source.thresholds || [],
    status: source.status,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeFxRate(item) {
  const source = item.toObject ? item.toObject() : item;
  return {
    id: String(source._id),
    base: source.base,
    quote: source.quote,
    rate: source.rate,
    rateDate: source.rateDate,
    source: source.source || "manual",
    bufferPct: source.bufferPct || 0,
    riskAdjustmentPct: source.riskAdjustmentPct || 0,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeSettings(item) {
  const source = item.toObject ? item.toObject() : item;
  return {
    id: String(source._id),
    key: source.key,
    baseCurrency: source.baseCurrency,
    originCountryCode: source.originCountryCode,
    defaultIncoterm: source.defaultIncoterm,
    marginAlertThreshold: source.marginAlertThreshold,
    requirementExpiryDays: source.requirementExpiryDays,
    updatedAt: source.updatedAt,
  };
}

function serializeMarket(item, extras = {}, hideFinance = false) {
  const source = item.toObject ? item.toObject() : item;
  return stripFinance(
    {
      id: String(source._id),
      name: source.name,
      countryCode: source.countryCode,
      countryName: source.countryName || "",
      regionCode: source.regionCode || "",
      currencyCode: source.currencyCode || "USD",
      timeZone: source.timeZone || "",
      language: source.language || "",
      status: source.status,
      marketType: source.marketType || "",
      targetSegment: source.targetSegment || "",
      marketSize: source.marketSize || 0,
      estimatedDemand: source.estimatedDemand || 0,
      expectedAnnualVolume: source.expectedAnnualVolume || 0,
      targetRevenue: source.targetRevenue || 0,
      expectedMargin: source.expectedMargin || 0,
      growthPotential: source.growthPotential || 0,
      description: source.description || "",
      notes: source.notes || "",
      ownerId: idOf(source.ownerId),
      owner: serializePerson(source.ownerId),
      managerId: idOf(source.managerId),
      manager: serializePerson(source.managerId),
      opportunityScore: source.opportunityScore || 0,
      riskScore: source.riskScore || 0,
      scoreBreakdown: source.scoreBreakdown || {},
      scoreLabel: source.scoreLabel || "",
      customFields: source.customFields || {},
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      ...extras,
    },
    hideFinance
  );
}

function serializeMapping(item) {
  const source = item.toObject ? item.toObject() : item;
  return {
    id: String(source._id),
    marketId: idOf(source.marketId),
    market: serializeRef(source.marketId),
    productId: idOf(source.productId),
    product: serializeRef(source.productId, { sku: source.productId?.sku, hsCode: source.productId?.hsCode }),
    hsCode: source.hsCode || "",
    eligibilityStatus: source.eligibilityStatus,
    minOrderQty: source.minOrderQty || 0,
    maxQty: source.maxQty || 0,
    targetPrice: source.targetPrice || 0,
    minPrice: source.minPrice || 0,
    currency: source.currency || "USD",
    incotermCode: source.incotermCode || "",
    tariffRate: source.tariffRate || 0,
    dutyRate: source.dutyRate || 0,
    requiredCertifications: source.requiredCertifications || "",
    packagingRequirements: source.packagingRequirements || "",
    labelRequirements: source.labelRequirements || "",
    testingRequirements: source.testingRequirements || "",
    shelfLifeDays: source.shelfLifeDays || 0,
    importRestrictions: source.importRestrictions || "",
    notes: source.notes || "",
    effectiveFrom: source.effectiveFrom,
    effectiveUntil: source.effectiveUntil,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeCorridor(item, extras = {}, hideFinance = false) {
  const source = item.toObject ? item.toObject() : item;
  return stripFinance(
    {
      id: String(source._id),
      name: source.name,
      code: source.code || "",
      marketId: idOf(source.marketId),
      market: serializeRef(source.marketId, { countryCode: source.marketId?.countryCode, currencyCode: source.marketId?.currencyCode }),
      originCountryCode: source.originCountryCode || "",
      originState: source.originState || "",
      originCity: source.originCity || "",
      originLocationId: idOf(source.originLocationId),
      destCountryCode: source.destCountryCode || "",
      destCity: source.destCity || "",
      destLocationId: idOf(source.destLocationId),
      primaryMode: source.primaryMode,
      secondaryMode: source.secondaryMode || "",
      status: source.status,
      priority: source.priority || 0,
      isPrimary: Boolean(source.isPrimary),
      ownerId: idOf(source.ownerId),
      owner: serializePerson(source.ownerId),
      transitMinDays: source.transitMinDays || 0,
      transitAvgDays: source.transitAvgDays || 0,
      transitMaxDays: source.transitMaxDays || 0,
      reliability: source.reliability || 0,
      capacity: source.capacity || 0,
      riskScore: source.riskScore || 0,
      corridorScore: source.corridorScore || 0,
      scoreBreakdown: source.scoreBreakdown || {},
      scoreLabel: source.scoreLabel || "",
      notes: source.notes || "",
      segments: source.segments || [],
      costs: source.costs || [],
      customFields: source.customFields || {},
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      ...extras,
    },
    hideFinance
  );
}

function serializeRequirement(item) {
  const source = item.toObject ? item.toObject() : item;
  return {
    id: String(source._id),
    name: source.name,
    marketId: idOf(source.marketId),
    market: serializeRef(source.marketId),
    productId: idOf(source.productId),
    product: serializeRef(source.productId),
    productCategory: source.productCategory || "",
    requirementType: source.requirementType || "",
    mandatory: Boolean(source.mandatory),
    effectiveDate: source.effectiveDate,
    expiryDate: source.expiryDate,
    documentRequired: Boolean(source.documentRequired),
    responsibleRole: source.responsibleRole || "",
    responsibleUserId: idOf(source.responsibleUserId),
    status: source.status,
    notes: source.notes || "",
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeRisk(item) {
  const source = item.toObject ? item.toObject() : item;
  return {
    id: String(source._id),
    scopeType: source.scopeType,
    scopeId: idOf(source.scopeId),
    riskType: source.riskType,
    score: source.score || 0,
    severity: source.severity,
    probability: source.probability || 0,
    impact: source.impact || 0,
    mitigation: source.mitigation || "",
    ownerId: idOf(source.ownerId),
    owner: serializePerson(source.ownerId),
    status: source.status,
    reviewDate: source.reviewDate,
    notes: source.notes || "",
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeBuyer(item) {
  const source = item.toObject ? item.toObject() : item;
  return {
    id: String(source._id),
    name: source.name,
    legalName: source.legalName || "",
    marketId: idOf(source.marketId),
    market: serializeRef(source.marketId, { countryCode: source.marketId?.countryCode }),
    segment: source.segment || "",
    email: source.email || "",
    phone: source.phone || "",
    country: source.country || "",
    city: source.city || "",
    productInterest: source.productInterest || "",
    productIds: (source.productIds || []).map(idOf),
    annualPotential: source.annualPotential || 0,
    priceExpectation: source.priceExpectation || 0,
    paymentTerms: source.paymentTerms || "",
    creditRisk: source.creditRisk || 0,
    ownerId: idOf(source.ownerId),
    owner: serializePerson(source.ownerId),
    status: source.status,
    notes: source.notes || "",
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeOpportunity(item, hideFinance = false) {
  const source = item.toObject ? item.toObject() : item;
  return stripFinance(
    {
      id: String(source._id),
      title: source.title,
      marketId: idOf(source.marketId),
      market: serializeRef(source.marketId),
      productId: idOf(source.productId),
      product: serializeRef(source.productId),
      buyerId: idOf(source.buyerId),
      buyer: serializeRef(source.buyerId),
      corridorId: idOf(source.corridorId),
      corridor: serializeRef(source.corridorId),
      expectedVolume: source.expectedVolume || 0,
      expectedRevenue: source.expectedRevenue || 0,
      expectedMargin: source.expectedMargin || 0,
      probability: source.probability || 0,
      expectedShipmentDate: source.expectedShipmentDate,
      incotermCode: source.incotermCode || "",
      currency: source.currency || "USD",
      stage: source.stage,
      ownerId: idOf(source.ownerId),
      owner: serializePerson(source.ownerId),
      nextAction: source.nextAction || "",
      nextActionAt: source.nextActionAt,
      lostReason: source.lostReason || "",
      notes: source.notes || "",
      landedCostSnapshot: hideFinance ? null : source.landedCostSnapshot,
      convertedAt: source.convertedAt,
      lostAt: source.lostAt,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    },
    hideFinance
  );
}

function serializePricing(item, hideFinance = false) {
  const source = item.toObject ? item.toObject() : item;
  return stripFinance(
    {
      id: String(source._id),
      productId: idOf(source.productId),
      product: serializeRef(source.productId),
      marketId: idOf(source.marketId),
      market: serializeRef(source.marketId),
      buyerId: idOf(source.buyerId),
      buyer: serializeRef(source.buyerId),
      currency: source.currency,
      basePrice: source.basePrice || 0,
      minPrice: source.minPrice || 0,
      targetPrice: source.targetPrice || 0,
      maxPrice: source.maxPrice || 0,
      incotermCode: source.incotermCode || "",
      volumeMin: source.volumeMin || 0,
      volumeMax: source.volumeMax || 0,
      pricingType: source.pricingType,
      effectiveFrom: source.effectiveFrom,
      effectiveUntil: source.effectiveUntil,
      status: source.status,
      notes: source.notes || "",
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    },
    hideFinance
  );
}

function serializeRule(item) {
  const source = item.toObject ? item.toObject() : item;
  return {
    id: String(source._id),
    name: source.name,
    enabled: Boolean(source.enabled),
    priority: source.priority || 0,
    version: source.version || 1,
    effectiveFrom: source.effectiveFrom,
    effectiveUntil: source.effectiveUntil,
    conditionGroup: source.conditionGroup || { operator: "AND", conditions: [], groups: [] },
    actions: source.actions || [],
    notes: source.notes || "",
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeAlertRule(item) {
  const source = item.toObject ? item.toObject() : item;
  return {
    id: String(source._id),
    name: source.name,
    eventType: source.eventType,
    enabled: Boolean(source.enabled),
    threshold: source.threshold || 0,
    notifyRoleSlugs: source.notifyRoleSlugs || [],
    userIds: (source.userIds || []).map(idOf),
    titleTemplate: source.titleTemplate || "",
    bodyTemplate: source.bodyTemplate || "",
    lastFiredAt: source.lastFiredAt,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeAlert(item) {
  const source = item.toObject ? item.toObject() : item;
  return {
    id: String(source._id),
    ruleId: idOf(source.ruleId),
    eventType: source.eventType,
    title: source.title,
    body: source.body || "",
    resourceType: source.resourceType || "",
    resourceId: source.resourceId || "",
    severity: source.severity,
    readAt: source.readAt,
    data: source.data || {},
    createdAt: source.createdAt,
  };
}

function serializePerformance(item, hideFinance = false) {
  const source = item.toObject ? item.toObject() : item;
  return stripFinance(
    {
      id: String(source._id),
      corridorId: idOf(source.corridorId),
      corridor: serializeRef(source.corridorId),
      periodStart: source.periodStart,
      periodEnd: source.periodEnd,
      plannedTransitDays: source.plannedTransitDays || 0,
      actualTransitDays: source.actualTransitDays || 0,
      plannedCost: source.plannedCost || 0,
      actualCost: source.actualCost || 0,
      plannedMargin: source.plannedMargin || 0,
      actualMargin: source.actualMargin || 0,
      onTimeDeliveryPct: source.onTimeDeliveryPct || 0,
      damagePct: source.damagePct || 0,
      customsDelayPct: source.customsDelayPct || 0,
      shipmentVolume: source.shipmentVolume || 0,
      revenue: source.revenue || 0,
      profit: source.profit || 0,
      currency: source.currency,
      notes: source.notes || "",
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    },
    hideFinance
  );
}

module.exports = {
  idOf,
  serializePerson,
  serializeLookup,
  serializeIncoterm,
  serializeScoreProfile,
  serializeFxRate,
  serializeSettings,
  serializeMarket,
  serializeMapping,
  serializeCorridor,
  serializeRequirement,
  serializeRisk,
  serializeBuyer,
  serializeOpportunity,
  serializePricing,
  serializeRule,
  serializeAlertRule,
  serializeAlert,
  serializePerformance,
};

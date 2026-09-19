const { success } = require("../../utils/ApiResponse");
const configService = require("./config.service");
const productService = require("./product.service");
const marketService = require("./market.service");
const corridorService = require("./corridor.service");
const commercialService = require("./commercial.service");
const complianceService = require("./compliance.service");
const pipelineService = require("./pipeline.service");
const intelligenceService = require("./intelligence.service");
const auditService = require("../audit/audit.service");

async function dashboard(req, res) {
  const data = await intelligenceService.dashboard(req);
  return success(res, { message: "Export dashboard fetched", data });
}

async function analytics(req, res) {
  const data = await intelligenceService.analytics(req.query, req);
  return success(res, { message: "Export analytics fetched", data });
}

async function assignees(req, res) {
  const items = await configService.assignees();
  return success(res, { message: "Assignees fetched", data: { items } });
}

async function getSettings(req, res) {
  const settings = await configService.getSettings();
  return success(res, { message: "Export settings fetched", data: { settings } });
}

async function updateSettings(req, res) {
  const settings = await configService.updateSettings(req.body, req.user, req);
  return success(res, { message: "Export settings updated", data: { settings } });
}

async function listLookups(req, res) {
  const data = await configService.listLookups(req.query);
  return success(res, { message: "Lookups fetched", data });
}

async function createLookup(req, res) {
  const lookup = await configService.createLookup(req.body, req.user, req);
  return success(res, { message: "Lookup created", data: { lookup }, status: 201 });
}

async function updateLookup(req, res) {
  const lookup = await configService.updateLookup(req.params.id, req.body, req.user, req);
  return success(res, { message: "Lookup updated", data: { lookup } });
}

async function removeLookup(req, res) {
  await configService.removeLookup(req.params.id, req.user, req);
  return success(res, { message: "Lookup deleted", data: null });
}

async function listIncoterms(req, res) {
  const data = await configService.listIncoterms(req.query);
  return success(res, { message: "Incoterms fetched", data });
}

async function createIncoterm(req, res) {
  const incoterm = await configService.createIncoterm(req.body, req.user, req);
  return success(res, { message: "Incoterm created", data: { incoterm }, status: 201 });
}

async function updateIncoterm(req, res) {
  const incoterm = await configService.updateIncoterm(req.params.id, req.body, req.user, req);
  return success(res, { message: "Incoterm updated", data: { incoterm } });
}

async function removeIncoterm(req, res) {
  await configService.removeIncoterm(req.params.id, req.user, req);
  return success(res, { message: "Incoterm deleted", data: null });
}

async function listScoreProfiles(req, res) {
  const data = await configService.listScoreProfiles(req.query);
  return success(res, { message: "Score profiles fetched", data });
}

async function createScoreProfile(req, res) {
  const profile = await configService.createScoreProfile(req.body, req.user, req);
  return success(res, { message: "Score profile created", data: { profile }, status: 201 });
}

async function updateScoreProfile(req, res) {
  const profile = await configService.updateScoreProfile(req.params.id, req.body, req.user, req);
  return success(res, { message: "Score profile updated", data: { profile } });
}

async function removeScoreProfile(req, res) {
  await configService.removeScoreProfile(req.params.id, req.user, req);
  return success(res, { message: "Score profile deleted", data: null });
}

async function listFxRates(req, res) {
  const data = await configService.listFxRates(req.query);
  return success(res, { message: "FX rates fetched", data });
}

async function createFxRate(req, res) {
  const rate = await configService.createFxRate(req.body, req.user, req);
  return success(res, { message: "FX rate created", data: { rate }, status: 201 });
}

async function updateFxRate(req, res) {
  const rate = await configService.updateFxRate(req.params.id, req.body, req.user, req);
  return success(res, { message: "FX rate updated", data: { rate } });
}

async function removeFxRate(req, res) {
  await configService.removeFxRate(req.params.id, req.user, req);
  return success(res, { message: "FX rate deleted", data: null });
}

async function listMarkets(req, res) {
  const data = await marketService.listMarkets(req.query, req);
  return success(res, { message: "Markets fetched", data });
}

async function getMarket(req, res) {
  const market = await marketService.getMarket(req.params.id, req);
  return success(res, { message: "Market fetched", data: { market } });
}

async function createMarket(req, res) {
  const market = await marketService.createMarket(req.body, req.user, req);
  return success(res, { message: "Market created", data: { market }, status: 201 });
}

async function updateMarket(req, res) {
  const market = await marketService.updateMarket(req.params.id, req.body, req.user, req);
  return success(res, { message: "Market updated", data: { market } });
}

async function removeMarket(req, res) {
  await marketService.removeMarket(req.params.id, req.user, req);
  return success(res, { message: "Market deleted", data: null });
}

async function evaluateMarket(req, res) {
  const market = await marketService.evaluateMarket(req.params.id, req.body, req.user, req);
  return success(res, { message: "Market scored", data: { market } });
}

async function compareMarkets(req, res) {
  const data = await marketService.compareMarkets(req.body.ids, req);
  return success(res, { message: "Markets compared", data });
}

async function listMappings(req, res) {
  const data = await productService.listMappings({ ...req.query, marketId: req.params.id || req.query.marketId });
  return success(res, { message: "Mappings fetched", data });
}

async function createMapping(req, res) {
  const mapping = await productService.createMapping(req.params.id, req.body, req.user, req);
  return success(res, { message: "Mapping created", data: { mapping }, status: 201 });
}

async function updateMapping(req, res) {
  const mapping = await productService.updateMapping(req.params.id, req.params.nestedId, req.body, req.user, req);
  return success(res, { message: "Mapping updated", data: { mapping } });
}

async function removeMapping(req, res) {
  await productService.removeMapping(req.params.id, req.params.nestedId, req.user, req);
  return success(res, { message: "Mapping deleted", data: null });
}

async function listCorridors(req, res) {
  const data = await corridorService.listCorridors(req.query, req);
  return success(res, { message: "Corridors fetched", data });
}

async function getCorridor(req, res) {
  const corridor = await corridorService.getCorridor(req.params.id, req);
  return success(res, { message: "Corridor fetched", data: { corridor } });
}

async function createCorridor(req, res) {
  const corridor = await corridorService.createCorridor(req.body, req.user, req);
  return success(res, { message: "Corridor created", data: { corridor }, status: 201 });
}

async function updateCorridor(req, res) {
  const corridor = await corridorService.updateCorridor(req.params.id, req.body, req.user, req);
  return success(res, { message: "Corridor updated", data: { corridor } });
}

async function removeCorridor(req, res) {
  await corridorService.removeCorridor(req.params.id, req.user, req);
  return success(res, { message: "Corridor deleted", data: null });
}

async function scoreCorridor(req, res) {
  const corridor = await corridorService.scoreCorridor(req.params.id, req.body, req.user, req);
  return success(res, { message: "Corridor scored", data: { corridor } });
}

async function compareCorridors(req, res) {
  const data = await corridorService.compareCorridors(req.body.corridorIds, req);
  return success(res, { message: "Corridors compared", data });
}

async function calculate(req, res) {
  const result = await commercialService.calculate(req.body, req.user, req);
  return success(res, { message: "Landed cost calculated", data: result });
}

async function listRequirements(req, res) {
  const data = await complianceService.listRequirements({ ...req.query, marketId: req.query.marketId || req.params.id });
  return success(res, { message: "Requirements fetched", data });
}

async function createRequirement(req, res) {
  const requirement = await complianceService.createRequirement(req.body, req.user, req);
  return success(res, { message: "Requirement created", data: { requirement }, status: 201 });
}

async function updateRequirement(req, res) {
  const requirement = await complianceService.updateRequirement(req.params.id, req.body, req.user, req);
  return success(res, { message: "Requirement updated", data: { requirement } });
}

async function removeRequirement(req, res) {
  await complianceService.removeRequirement(req.params.id, req.user, req);
  return success(res, { message: "Requirement deleted", data: null });
}

async function listRules(req, res) {
  const data = await complianceService.listRules(req.query);
  return success(res, { message: "Trade rules fetched", data });
}

async function createRule(req, res) {
  const rule = await complianceService.createRule(req.body, req.user, req);
  return success(res, { message: "Trade rule created", data: { rule }, status: 201 });
}

async function updateRule(req, res) {
  const rule = await complianceService.updateRule(req.params.id, req.body, req.user, req);
  return success(res, { message: "Trade rule updated", data: { rule } });
}

async function removeRule(req, res) {
  await complianceService.removeRule(req.params.id, req.user, req);
  return success(res, { message: "Trade rule deleted", data: null });
}

async function testRule(req, res) {
  const data = await complianceService.testRule(req.params.id, req.body.facts || req.body);
  return success(res, { message: "Rule tested", data });
}

async function listRisks(req, res) {
  const data = await complianceService.listRisks({
    ...req.query,
    scopeId: req.query.scopeId || req.params.id,
    scopeType: req.query.scopeType,
  });
  return success(res, { message: "Risks fetched", data });
}

async function createRisk(req, res) {
  const risk = await complianceService.createRisk(req.body, req.user, req);
  return success(res, { message: "Risk created", data: { risk }, status: 201 });
}

async function updateRisk(req, res) {
  const risk = await complianceService.updateRisk(req.params.id, req.body, req.user, req);
  return success(res, { message: "Risk updated", data: { risk } });
}

async function removeRisk(req, res) {
  await complianceService.removeRisk(req.params.id, req.user, req);
  return success(res, { message: "Risk deleted", data: null });
}

async function listBuyers(req, res) {
  const data = await pipelineService.listBuyers(req.query);
  return success(res, { message: "Distributors fetched", data });
}

async function getBuyer(req, res) {
  const buyer = await pipelineService.getBuyer(req.params.id);
  return success(res, { message: "Distributor fetched", data: { buyer } });
}

async function createBuyer(req, res) {
  const buyer = await pipelineService.createBuyer(req.body, req.user, req);
  return success(res, { message: "Distributor created", data: { buyer }, status: 201 });
}

async function updateBuyer(req, res) {
  const buyer = await pipelineService.updateBuyer(req.params.id, req.body, req.user, req);
  return success(res, { message: "Distributor updated", data: { buyer } });
}

async function removeBuyer(req, res) {
  await pipelineService.removeBuyer(req.params.id, req.user, req);
  return success(res, { message: "Distributor deleted", data: null });
}

async function startBuyerOnboarding(req, res) {
  const data = await pipelineService.startBuyerOnboarding(req.params.id, req.user, req);
  return success(res, { message: "Distributor onboarding started", data });
}

async function listOpportunities(req, res) {
  const data = await pipelineService.listOpportunities(req.query, req);
  return success(res, { message: "Opportunities fetched", data });
}

async function getOpportunity(req, res) {
  const opportunity = await pipelineService.getOpportunity(req.params.id, req);
  return success(res, { message: "Opportunity fetched", data: { opportunity } });
}

async function createOpportunity(req, res) {
  const opportunity = await pipelineService.createOpportunity(req.body, req.user, req);
  return success(res, { message: "Opportunity created", data: { opportunity }, status: 201 });
}

async function updateOpportunity(req, res) {
  const opportunity = await pipelineService.updateOpportunity(req.params.id, req.body, req.user, req);
  return success(res, { message: "Opportunity updated", data: { opportunity } });
}

async function stageOpportunity(req, res) {
  const opportunity = await pipelineService.updateOpportunityStage(req.params.id, req.body, req.user, req);
  return success(res, { message: "Opportunity updated", data: { opportunity } });
}

async function removeOpportunity(req, res) {
  await pipelineService.removeOpportunity(req.params.id, req.user, req);
  return success(res, { message: "Opportunity deleted", data: null });
}

async function listPricing(req, res) {
  const data = await commercialService.listPricing(req.query, req);
  return success(res, { message: "Pricing fetched", data });
}

async function createPricing(req, res) {
  const pricing = await commercialService.createPricing(req.body, req.user, req);
  return success(res, { message: "Pricing created", data: { pricing }, status: 201 });
}

async function updatePricing(req, res) {
  const pricing = await commercialService.updatePricing(req.params.id, req.body, req.user, req);
  return success(res, { message: "Pricing updated", data: { pricing } });
}

async function removePricing(req, res) {
  await commercialService.removePricing(req.params.id, req.user, req);
  return success(res, { message: "Pricing deleted", data: null });
}

async function listPerformance(req, res) {
  const data = await corridorService.listPerformance(req.params.id, req.query, req);
  return success(res, { message: "Performance fetched", data });
}

async function createPerformance(req, res) {
  const performance = await corridorService.createPerformance(req.params.id, req.body, req.user, req);
  return success(res, { message: "Performance created", data: { performance }, status: 201 });
}

async function updatePerformance(req, res) {
  const performance = await corridorService.updatePerformance(req.params.id, req.params.nestedId, req.body, req.user, req);
  return success(res, { message: "Performance updated", data: { performance } });
}

async function removePerformance(req, res) {
  await corridorService.removePerformance(req.params.id, req.params.nestedId, req.user, req);
  return success(res, { message: "Performance deleted", data: null });
}

async function listAlerts(req, res) {
  const data = await intelligenceService.listAlerts(req.query);
  return success(res, { message: "Alerts fetched", data });
}

async function markAlertRead(req, res) {
  const alert = await intelligenceService.markAlertRead(req.params.id);
  return success(res, { message: "Alert updated", data: { alert } });
}

async function listAlertRules(req, res) {
  const data = await intelligenceService.listAlertRules(req.query);
  return success(res, { message: "Alert rules fetched", data });
}

async function createAlertRule(req, res) {
  const rule = await intelligenceService.createAlertRule(req.body, req.user, req);
  return success(res, { message: "Alert rule created", data: { rule }, status: 201 });
}

async function updateAlertRule(req, res) {
  const rule = await intelligenceService.updateAlertRule(req.params.id, req.body, req.user, req);
  return success(res, { message: "Alert rule updated", data: { rule } });
}

async function removeAlertRule(req, res) {
  await intelligenceService.removeAlertRule(req.params.id, req.user, req);
  return success(res, { message: "Alert rule deleted", data: null });
}

async function listActivity(req, res) {
  let moduleName = req.query.module;
  if (!moduleName && req.originalUrl.includes("/markets/")) moduleName = "export-markets";
  if (!moduleName && req.originalUrl.includes("/corridors/")) moduleName = "export-corridors";
  const data = await auditService.list({
    ...req.query,
    module: moduleName,
    resourceId: req.params.id || req.query.resourceId,
  });
  return success(res, { message: "Activity fetched", data });
}

module.exports = {
  dashboard,
  analytics,
  assignees,
  getSettings,
  updateSettings,
  listLookups,
  createLookup,
  updateLookup,
  removeLookup,
  listIncoterms,
  createIncoterm,
  updateIncoterm,
  removeIncoterm,
  listScoreProfiles,
  createScoreProfile,
  updateScoreProfile,
  removeScoreProfile,
  listFxRates,
  createFxRate,
  updateFxRate,
  removeFxRate,
  listMarkets,
  getMarket,
  createMarket,
  updateMarket,
  removeMarket,
  evaluateMarket,
  compareMarkets,
  listMappings,
  createMapping,
  updateMapping,
  removeMapping,
  listCorridors,
  getCorridor,
  createCorridor,
  updateCorridor,
  removeCorridor,
  scoreCorridor,
  compareCorridors,
  calculate,
  listRequirements,
  createRequirement,
  updateRequirement,
  removeRequirement,
  listRules,
  createRule,
  updateRule,
  removeRule,
  testRule,
  listRisks,
  createRisk,
  updateRisk,
  removeRisk,
  listBuyers,
  getBuyer,
  createBuyer,
  updateBuyer,
  removeBuyer,
  startBuyerOnboarding,
  listOpportunities,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  stageOpportunity,
  removeOpportunity,
  listPricing,
  createPricing,
  updatePricing,
  removePricing,
  listPerformance,
  createPerformance,
  updatePerformance,
  removePerformance,
  listAlerts,
  markAlertRead,
  listAlertRules,
  createAlertRule,
  updateAlertRule,
  removeAlertRule,
  listActivity,
};

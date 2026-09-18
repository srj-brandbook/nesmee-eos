const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/authenticate");
const { requirePermission } = require("../../middleware/requirePermission");
const controller = require("./export.controller");
const v = require("./export.validator");

const router = express.Router();
router.use(authenticate);

function perm(name) {
  return requirePermission(name);
}

router.get("/dashboard", perm("export.view"), catchAsync(controller.dashboard));
router.get("/analytics", perm("export.analytics.view"), validate(v.analyticsQuery), catchAsync(controller.analytics));
router.get("/assignees", perm("export.view"), catchAsync(controller.assignees));

router.get("/settings", perm("export.settings.view"), catchAsync(controller.getSettings));
router.patch("/settings", perm("export.settings.update"), validate(v.updateSettings), catchAsync(controller.updateSettings));

router.get("/lookups", perm("export.view"), validate(v.listLookups), catchAsync(controller.listLookups));
router.post("/lookups", perm("export.settings.update"), validate(v.createLookup), catchAsync(controller.createLookup));
router.patch("/lookups/:id", perm("export.settings.update"), validate(v.updateLookup), catchAsync(controller.updateLookup));
router.delete("/lookups/:id", perm("export.settings.update"), validate(v.idParam), catchAsync(controller.removeLookup));

router.get("/incoterms", perm("export.view"), validate(v.listIncoterms), catchAsync(controller.listIncoterms));
router.post("/incoterms", perm("export.settings.update"), validate(v.createIncoterm), catchAsync(controller.createIncoterm));
router.patch("/incoterms/:id", perm("export.settings.update"), validate(v.updateIncoterm), catchAsync(controller.updateIncoterm));
router.delete("/incoterms/:id", perm("export.settings.update"), validate(v.idParam), catchAsync(controller.removeIncoterm));

router.get("/score-profiles", perm("export.view"), validate(v.listScoreProfiles), catchAsync(controller.listScoreProfiles));
router.post("/score-profiles", perm("export.settings.update"), validate(v.createScoreProfile), catchAsync(controller.createScoreProfile));
router.patch("/score-profiles/:id", perm("export.settings.update"), validate(v.updateScoreProfile), catchAsync(controller.updateScoreProfile));
router.delete("/score-profiles/:id", perm("export.settings.update"), validate(v.idParam), catchAsync(controller.removeScoreProfile));

router.get("/fx-rates", perm("export.calculator.view"), validate(v.listFxRates), catchAsync(controller.listFxRates));
router.post("/fx-rates", perm("export.settings.update"), validate(v.createFxRate), catchAsync(controller.createFxRate));
router.patch("/fx-rates/:id", perm("export.settings.update"), validate(v.updateFxRate), catchAsync(controller.updateFxRate));
router.delete("/fx-rates/:id", perm("export.settings.update"), validate(v.idParam), catchAsync(controller.removeFxRate));

router.get("/products", perm("export.products.view"), validate(v.listProducts), catchAsync(controller.listProducts));
router.post("/products", perm("export.products.create"), validate(v.createProduct), catchAsync(controller.createProduct));
router.get("/products/:id", perm("export.products.view"), validate(v.idParam), catchAsync(controller.getProduct));
router.patch("/products/:id", perm("export.products.update"), validate(v.updateProduct), catchAsync(controller.updateProduct));
router.delete("/products/:id", perm("export.products.delete"), validate(v.idParam), catchAsync(controller.removeProduct));

router.get("/markets", perm("export.markets.view"), validate(v.listMarkets), catchAsync(controller.listMarkets));
router.post("/markets", perm("export.markets.create"), validate(v.createMarket), catchAsync(controller.createMarket));
router.post("/markets/compare", perm("export.markets.view"), validate(v.compareMarkets), catchAsync(controller.compareMarkets));
router.get("/markets/:id", perm("export.markets.view"), validate(v.idParam), catchAsync(controller.getMarket));
router.patch("/markets/:id", perm("export.markets.update"), validate(v.updateMarket), catchAsync(controller.updateMarket));
router.delete("/markets/:id", perm("export.markets.delete"), validate(v.idParam), catchAsync(controller.removeMarket));
router.post("/markets/:id/evaluate", perm("export.markets.update"), validate(v.evaluateMarket), catchAsync(controller.evaluateMarket));
router.post("/markets/:id/score", perm("export.markets.update"), validate(v.evaluateMarket), catchAsync(controller.evaluateMarket));
router.get("/markets/:id/products", perm("export.mappings.view"), validate(v.listMappings), catchAsync(controller.listMappings));
router.post("/markets/:id/products", perm("export.mappings.update"), validate(v.createMapping), catchAsync(controller.createMapping));
router.patch("/markets/:id/products/:nestedId", perm("export.mappings.update"), validate(v.updateMapping), catchAsync(controller.updateMapping));
router.delete("/markets/:id/products/:nestedId", perm("export.mappings.update"), validate(v.nestedParam), catchAsync(controller.removeMapping));
router.get("/markets/:id/requirements", perm("export.compliance.view"), validate(v.listRequirements), catchAsync(controller.listRequirements));
router.get("/markets/:id/risks", perm("export.risks.view"), validate(v.listRisks), catchAsync(controller.listRisks));
router.get("/markets/:id/activity", perm("export.markets.view"), catchAsync(controller.listActivity));

router.get("/corridors", perm("export.corridors.view"), validate(v.listCorridors), catchAsync(controller.listCorridors));
router.post("/corridors", perm("export.corridors.create"), validate(v.createCorridor), catchAsync(controller.createCorridor));
router.post("/corridors/compare", perm("export.corridors.compare"), validate(v.compareCorridors), catchAsync(controller.compareCorridors));
router.get("/corridors/:id", perm("export.corridors.view"), validate(v.idParam), catchAsync(controller.getCorridor));
router.patch("/corridors/:id", perm("export.corridors.update"), validate(v.updateCorridor), catchAsync(controller.updateCorridor));
router.delete("/corridors/:id", perm("export.corridors.delete"), validate(v.idParam), catchAsync(controller.removeCorridor));
router.post("/corridors/:id/score", perm("export.corridors.update"), validate(v.evaluateMarket), catchAsync(controller.scoreCorridor));
router.get("/corridors/:id/risks", perm("export.risks.view"), validate(v.listRisks), catchAsync(controller.listRisks));
router.get("/corridors/:id/performance", perm("export.corridors.view"), validate(v.listPerformance), catchAsync(controller.listPerformance));
router.post("/corridors/:id/performance", perm("export.corridors.update"), validate(v.createPerformance), catchAsync(controller.createPerformance));
router.patch("/corridors/:id/performance/:nestedId", perm("export.corridors.update"), validate(v.updatePerformance), catchAsync(controller.updatePerformance));
router.delete("/corridors/:id/performance/:nestedId", perm("export.corridors.update"), validate(v.nestedParam), catchAsync(controller.removePerformance));
router.get("/corridors/:id/activity", perm("export.corridors.view"), catchAsync(controller.listActivity));

router.post("/calculator/landed-cost", perm("export.calculator.view"), validate(v.calculate), catchAsync(controller.calculate));

router.get("/requirements", perm("export.compliance.view"), validate(v.listRequirements), catchAsync(controller.listRequirements));
router.post("/requirements", perm("export.compliance.manage"), validate(v.createRequirement), catchAsync(controller.createRequirement));
router.patch("/requirements/:id", perm("export.compliance.manage"), validate(v.updateRequirement), catchAsync(controller.updateRequirement));
router.delete("/requirements/:id", perm("export.compliance.manage"), validate(v.idParam), catchAsync(controller.removeRequirement));

router.get("/trade-rules", perm("export.compliance.view"), validate(v.listRules), catchAsync(controller.listRules));
router.post("/trade-rules", perm("export.compliance.manage"), validate(v.createRule), catchAsync(controller.createRule));
router.patch("/trade-rules/:id", perm("export.compliance.manage"), validate(v.updateRule), catchAsync(controller.updateRule));
router.delete("/trade-rules/:id", perm("export.compliance.manage"), validate(v.idParam), catchAsync(controller.removeRule));
router.post("/trade-rules/:id/test", perm("export.compliance.view"), validate(v.testRule), catchAsync(controller.testRule));

router.get("/risks", perm("export.risks.view"), validate(v.listRisks), catchAsync(controller.listRisks));
router.post("/risks", perm("export.risks.manage"), validate(v.createRisk), catchAsync(controller.createRisk));
router.patch("/risks/:id", perm("export.risks.manage"), validate(v.updateRisk), catchAsync(controller.updateRisk));
router.delete("/risks/:id", perm("export.risks.manage"), validate(v.idParam), catchAsync(controller.removeRisk));

router.get("/buyers", perm("export.buyers.view"), validate(v.listBuyers), catchAsync(controller.listBuyers));
router.post("/buyers", perm("export.buyers.create"), validate(v.createBuyer), catchAsync(controller.createBuyer));
router.get("/buyers/:id", perm("export.buyers.view"), validate(v.idParam), catchAsync(controller.getBuyer));
router.post("/buyers/:id/onboarding", perm("export.buyers.update"), validate(v.idParam), catchAsync(controller.startBuyerOnboarding));
router.patch("/buyers/:id", perm("export.buyers.update"), validate(v.updateBuyer), catchAsync(controller.updateBuyer));
router.delete("/buyers/:id", perm("export.buyers.delete"), validate(v.idParam), catchAsync(controller.removeBuyer));

router.get("/opportunities", perm("export.opportunities.view"), validate(v.listOpportunities), catchAsync(controller.listOpportunities));
router.post("/opportunities", perm("export.opportunities.create"), validate(v.createOpportunity), catchAsync(controller.createOpportunity));
router.get("/opportunities/:id", perm("export.opportunities.view"), validate(v.idParam), catchAsync(controller.getOpportunity));
router.patch("/opportunities/:id", perm("export.opportunities.update"), validate(v.updateOpportunity), catchAsync(controller.updateOpportunity));
router.patch("/opportunities/:id/stage", perm("export.opportunities.update"), validate(v.stageOpportunity), catchAsync(controller.stageOpportunity));
router.delete("/opportunities/:id", perm("export.opportunities.delete"), validate(v.idParam), catchAsync(controller.removeOpportunity));

router.get("/pricing", perm("export.pricing.view"), validate(v.listPricing), catchAsync(controller.listPricing));
router.post("/pricing", perm("export.pricing.manage"), validate(v.createPricing), catchAsync(controller.createPricing));
router.patch("/pricing/:id", perm("export.pricing.manage"), validate(v.updatePricing), catchAsync(controller.updatePricing));
router.delete("/pricing/:id", perm("export.pricing.manage"), validate(v.idParam), catchAsync(controller.removePricing));

router.get("/alerts", perm("export.alerts.view"), validate(v.listAlerts), catchAsync(controller.listAlerts));
router.post("/alerts/:id/read", perm("export.alerts.view"), validate(v.idParam), catchAsync(controller.markAlertRead));
router.get("/alert-rules", perm("export.alerts.manage"), catchAsync(controller.listAlertRules));
router.post("/alert-rules", perm("export.alerts.manage"), validate(v.createAlertRule), catchAsync(controller.createAlertRule));
router.patch("/alert-rules/:id", perm("export.alerts.manage"), validate(v.updateAlertRule), catchAsync(controller.updateAlertRule));
router.delete("/alert-rules/:id", perm("export.alerts.manage"), validate(v.idParam), catchAsync(controller.removeAlertRule));

module.exports = router;

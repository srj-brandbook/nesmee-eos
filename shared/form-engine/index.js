const ids = require("./ids");
const geo = require("./geo");
const { FIELD_TYPES, BASIC_FIELD_TYPES, ADVANCED_FIELD_TYPES, fieldTypeMeta, operatorsForField, fieldSupportsProperty, fieldSupportsValidator } = require("./registries/fieldTypes");
const { VALIDATOR_TYPES, validatorMeta, createValidator } = require("./registries/validators");
const operators = require("./registries/operators");
const actions = require("./registries/actions");
const factories = require("./models/factories");
const normalize = require("./normalizeValue");
const validation = require("./validation/validator");
const conditionEvaluator = require("./rules/conditionEvaluator");
const dependencyGraph = require("./rules/dependencyGraph");
const conflictResolver = require("./rules/conflictResolver");
const actionExecutor = require("./rules/actionExecutor");
const ruleEvaluator = require("./rules/ruleEvaluator");
const summarizeRule = require("./rules/summarizeRule");
const { validateFormConfiguration } = require("./configurationValidator");
const { createSupplierOnboardingTemplate } = require("./templates/supplierOnboarding");
const { createFrozenFoodPermitTemplate } = require("./templates/frozenFoodPermit");

module.exports = {
  ...ids,
  ...geo,
  FIELD_TYPES,
  BASIC_FIELD_TYPES,
  ADVANCED_FIELD_TYPES,
  fieldTypeMeta,
  operatorsForField,
  fieldSupportsProperty,
  fieldSupportsValidator,
  VALIDATOR_TYPES,
  validatorMeta,
  createValidator,
  ...operators,
  ...actions,
  ...factories,
  ...normalize,
  ...validation,
  ...conditionEvaluator,
  ...dependencyGraph,
  ...conflictResolver,
  ...actionExecutor,
  ...ruleEvaluator,
  ...summarizeRule,
  validateFormConfiguration,
  createSupplierOnboardingTemplate,
  createFrozenFoodPermitTemplate,
};

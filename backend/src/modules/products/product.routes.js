const express = require("express");
const catchAsync = require("../../utils/catchAsync");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/authenticate");
const { requirePermission } = require("../../middleware/requirePermission");
const controller = require("./product.controller");
const {
  listSchema,
  createSchema,
  updateSchema,
  idParamSchema,
  shareCreateSchema,
  shareRevokeSchema,
  sharesQuerySchema,
  suppliersQuerySchema,
} = require("./product.validator");

const router = express.Router();
router.use(authenticate);

function perm(name) {
  return requirePermission(name);
}

router.get("/suppliers", perm("products.view"), validate(suppliersQuerySchema), catchAsync(controller.suppliers));
router.get("/distributors", perm("products.share"), validate(suppliersQuerySchema), catchAsync(controller.distributors));
router.get("/categories", perm("products.view"), catchAsync(controller.categories));
router.get("/shares", perm("products.view"), validate(sharesQuerySchema), catchAsync(controller.listShares));

router.get("/", perm("products.view"), validate(listSchema), catchAsync(controller.list));
router.post("/", perm("products.create"), validate(createSchema), catchAsync(controller.create));
router.get("/:id", perm("products.view"), validate(idParamSchema), catchAsync(controller.get));
router.patch("/:id", perm("products.update"), validate(updateSchema), catchAsync(controller.update));
router.delete("/:id", perm("products.delete"), validate(idParamSchema), catchAsync(controller.remove));
router.post("/:id/list", perm("products.list"), validate(idParamSchema), catchAsync(controller.listToCatalog));
router.post("/:id/unlist", perm("products.list"), validate(idParamSchema), catchAsync(controller.unlistFromCatalog));
router.post("/:id/archive", perm("products.update"), validate(idParamSchema), catchAsync(controller.archive));
router.get("/:id/shares", perm("products.view"), validate(idParamSchema), catchAsync(controller.sharesForProduct));
router.post("/:id/shares", perm("products.share"), validate(shareCreateSchema), catchAsync(controller.share));
router.post("/:id/shares/:shareId/revoke", perm("products.share"), validate(shareRevokeSchema), catchAsync(controller.revokeShare));

module.exports = router;

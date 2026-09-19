const { success } = require("../../utils/ApiResponse");
const productService = require("./product.service");

async function list(req, res) {
  const data = await productService.list(req.query, req);
  return success(res, { message: "Products fetched", data });
}

async function get(req, res) {
  const product = await productService.getById(req.params.id, req);
  return success(res, { message: "Product fetched", data: { product } });
}

async function create(req, res) {
  const product = await productService.create(req.body, req.user, req);
  return success(res, { message: "Product created", data: { product }, status: 201 });
}

async function update(req, res) {
  const product = await productService.update(req.params.id, req.body, req.user, req);
  return success(res, { message: "Product updated", data: { product } });
}

async function remove(req, res) {
  await productService.remove(req.params.id, req.user, req);
  return success(res, { message: "Product deleted", data: null });
}

async function listToCatalog(req, res) {
  const product = await productService.listToCatalog(req.params.id, req.user, req);
  return success(res, { message: "Product listed", data: { product } });
}

async function unlistFromCatalog(req, res) {
  const product = await productService.unlistFromCatalog(req.params.id, req.user, req);
  return success(res, { message: "Product unlisted", data: { product } });
}

async function archive(req, res) {
  const product = await productService.archive(req.params.id, req.user, req);
  return success(res, { message: "Product archived", data: { product } });
}

async function sharesForProduct(req, res) {
  const data = await productService.listShares({ ...req.query, productId: req.params.id });
  return success(res, { message: "Shares fetched", data });
}

async function listShares(req, res) {
  const data = await productService.listShares(req.query);
  return success(res, { message: "Shares fetched", data });
}

async function share(req, res) {
  const shareItem = await productService.shareWithBuyer(req.params.id, req.body, req.user, req);
  return success(res, { message: "Product shared", data: { share: shareItem }, status: 201 });
}

async function revokeShare(req, res) {
  const shareItem = await productService.revokeShare(req.params.id, req.params.shareId, req.user, req);
  return success(res, { message: "Share revoked", data: { share: shareItem } });
}

async function suppliers(req, res) {
  const data = await productService.listSuppliers(req.query);
  return success(res, { message: "Suppliers fetched", data });
}

async function distributors(req, res) {
  const data = await productService.listDistributors(req.query);
  return success(res, { message: "Distributors fetched", data });
}

async function categories(req, res) {
  const data = await productService.listCategories();
  return success(res, { message: "Categories fetched", data });
}

module.exports = {
  list,
  get,
  create,
  update,
  remove,
  listToCatalog,
  unlistFromCatalog,
  archive,
  sharesForProduct,
  listShares,
  share,
  revokeShare,
  suppliers,
  distributors,
  categories,
};

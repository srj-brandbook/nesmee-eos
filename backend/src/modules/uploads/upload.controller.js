const { success } = require("../../utils/ApiResponse");
const uploadService = require("./upload.service");

async function signature(req, res) {
  const data = uploadService.sign(req.body);
  return success(res, { message: "Upload signature created", data });
}

async function destroy(req, res) {
  await uploadService.destroy(req.body);
  return success(res, { message: "File removed", data: null });
}

module.exports = { signature, destroy };

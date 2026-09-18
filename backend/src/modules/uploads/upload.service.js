const { v2: cloudinary } = require("cloudinary");
const env = require("../../config/env");
const ApiError = require("../../utils/ApiError");

const PURPOSES = ["avatars", "forms"];
const MAX_BYTES = {
  avatars: 2 * 1024 * 1024,
  forms: 15 * 1024 * 1024,
};

function configured() {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

function configure() {
  if (!configured()) throw ApiError.maintenance("File uploads are not configured");
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function purposeOf(folder) {
  const base = String(env.CLOUDINARY_FOLDER || "nesmee").replace(/\/+$/, "");
  if (PURPOSES.includes(folder)) return folder;
  const match = PURPOSES.find((purpose) => folder === `${base}/${purpose}`);
  if (match) return match;
  return null;
}

function resolveFolder(requested) {
  const purpose = purposeOf(requested);
  if (!purpose) throw ApiError.badRequest("Invalid upload folder", { folder: "Must be avatars or forms" });
  const base = String(env.CLOUDINARY_FOLDER || "nesmee").replace(/\/+$/, "");
  return { purpose, folder: `${base}/${purpose}` };
}

function assertOwnedPublicId(publicId) {
  const base = String(env.CLOUDINARY_FOLDER || "nesmee").replace(/\/+$/, "");
  const allowed = PURPOSES.some((purpose) => String(publicId || "").startsWith(`${base}/${purpose}/`));
  if (!allowed) throw ApiError.forbidden("Cannot modify this file");
}

function sign({ folder, resourceType = "auto", publicId } = {}) {
  configure();
  const resolved = resolveFolder(folder);
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { timestamp, folder: resolved.folder };
  if (publicId) params.public_id = publicId;
  const signature = cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET);
  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder: resolved.folder,
    publicId: publicId || "",
    resourceType: ["image", "raw", "auto", "video"].includes(resourceType) ? resourceType : "auto",
    maxBytes: MAX_BYTES[resolved.purpose],
  };
}

async function destroy({ publicId, resourceType = "image" } = {}) {
  configure();
  if (!publicId) throw ApiError.badRequest("Missing file id", { publicId: "Required" });
  assertOwnedPublicId(publicId);
  const type = ["image", "raw", "auto", "video"].includes(resourceType) ? resourceType : "image";
  await cloudinary.uploader.destroy(publicId, { resource_type: type === "auto" ? "image" : type, invalidate: true });
}

async function discardPrevious(previousPublicId, nextPublicId, resourceType = "image") {
  if (!previousPublicId || previousPublicId === nextPublicId) return;
  try {
    await destroy({ publicId: previousPublicId, resourceType });
  } catch {
    // Old asset may already be gone.
  }
}

module.exports = { sign, destroy, discardPrevious, configured, resolveFolder, MAX_BYTES };

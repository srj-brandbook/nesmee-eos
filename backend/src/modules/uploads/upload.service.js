const { v2: cloudinary } = require("cloudinary");
const env = require("../../config/env");
const ApiError = require("../../utils/ApiError");

const PURPOSES = ["avatars", "forms", "documents", "products"];
const MAX_BYTES = {
  avatars: 2 * 1024 * 1024,
  forms: 15 * 1024 * 1024,
  documents: 25 * 1024 * 1024,
  products: 80 * 1024 * 1024,
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
  if (!purpose) throw ApiError.badRequest("Invalid upload folder", { folder: "Must be avatars, forms, documents, or products" });
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

function uploadBuffer({ buffer, folder = "documents", filename = "document.pdf", resourceType = "image" } = {}) {
  configure();
  const resolved = resolveFolder(folder);
  const publicId = String(filename || "document")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9/_-]+/g, "-")
    .slice(0, 80);
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: resolved.folder,
        resource_type: resourceType,
        type: "upload",
        access_mode: "public",
        public_id: `${publicId}-${Date.now()}`,
        format: "pdf",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          name: filename,
          size: result.bytes || buffer.length,
          mimeType: "application/pdf",
          type: "application/pdf",
          resourceType: result.resource_type || resourceType,
          format: result.format || "pdf",
          pages: Number(result.pages) || 0,
        });
      }
    );
    stream.end(buffer);
  });
}

function candidateDownloadUrls(file) {
  const urls = [];
  if (file?.url) urls.push(file.url);
  if (!configured() || !file?.publicId) return [...new Set(urls.filter(Boolean))];
  configure();
  const original = String(file.publicId);
  const stripped = original.replace(/\.(pdf|jpe?g|png|webp)$/i, "");
  const ids = [...new Set([original, stripped])];
  const preferred = file.resourceType === "raw" ? ["raw", "image"] : ["image", "raw"];
  for (const publicId of ids) {
    for (const resourceType of preferred) {
      try {
        urls.push(
          cloudinary.utils.private_download_url(publicId, "pdf", {
            resource_type: resourceType,
            type: "upload",
            attachment: true,
            expires_at: Math.floor(Date.now() / 1000) + 120,
          })
        );
      } catch {
        // SDK may reject an unavailable type.
      }
      urls.push(
        cloudinary.url(publicId, {
          resource_type: resourceType,
          type: "upload",
          secure: true,
          sign_url: true,
          format: "pdf",
        })
      );
      urls.push(
        cloudinary.url(publicId, {
          resource_type: resourceType,
          type: "upload",
          secure: true,
          sign_url: true,
        })
      );
    }
  }
  return [...new Set(urls.filter(Boolean))];
}

async function downloadBuffer(file) {
  const urls = candidateDownloadUrls(file);
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length) return bytes;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || ApiError.badRequest("Could not download file");
}

module.exports = { sign, destroy, discardPrevious, configured, resolveFolder, uploadBuffer, downloadBuffer, MAX_BYTES };

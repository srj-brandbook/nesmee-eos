const DELIVERY =
  /^(https?:\/\/res\.cloudinary\.com\/[^/]+)\/(image|raw|video)\/(upload|authenticated|private)\/(.+)$/i;
const preloaded = new Set();

export function isPdfFile(file) {
  if (!file) return false;
  const type = `${file.type || ""} ${file.mimeType || ""}`.toLowerCase();
  const format = `${file.format || ""}`.toLowerCase();
  const name = `${file.name || ""} ${file.url || ""}`.toLowerCase();
  return type.includes("pdf") || format === "pdf" || name.includes(".pdf") || /\.pdf(\?|#|$)/.test(name);
}

export function isImageFile(file) {
  if (!file?.url) return false;
  if (isPdfFile(file)) return false;
  if ((file.type || file.mimeType || "").startsWith("image")) return true;
  const name = (file.name || file.url || "").toLowerCase();
  return file.resourceType === "image" && !/\.pdf(\?|#|$)/.test(name);
}

export function resourceTypeForFile(file, fallback = "auto") {
  if (!file) return fallback;
  const name = `${file.name || ""}`.toLowerCase();
  const type = `${file.type || file.mimeType || ""}`.toLowerCase();
  if (type.includes("pdf") || name.endsWith(".pdf") || `${file.format || ""}`.toLowerCase() === "pdf") return "image";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (fallback && fallback !== "auto") return fallback;
  return "raw";
}

export function parseDelivery(url) {
  const match = String(url || "").match(DELIVERY);
  if (!match) return null;
  return { origin: match[1], resource: match[2].toLowerCase(), kind: match[3], rest: match[4] };
}

export function stripDeliveryTransforms(rest) {
  let current = rest || "";
  while (current && !/^v\d+\//.test(current)) {
    const slash = current.indexOf("/");
    if (slash === -1) break;
    const first = current.slice(0, slash);
    if (/,/.test(first) || /^(f_|q_|w_|c_|pg_|dpr_|fl_)/.test(first)) {
      current = current.slice(slash + 1);
      continue;
    }
    break;
  }
  return current;
}

function publicIdFromFile(file) {
  if (file?.publicId) return String(file.publicId).replace(/\.(pdf|jpe?g|png|webp|gif)$/i, "");
  const parsed = parseDelivery(file?.url);
  if (!parsed) return "";
  return stripDeliveryTransforms(parsed.rest)
    .replace(/^v\d+\//, "")
    .replace(/\.(pdf|jpe?g|png|webp|gif)(\?.*)?$/i, "");
}

function originFromFile(file) {
  const parsed = parseDelivery(file?.url);
  return parsed?.origin || "";
}

function pageTransform(page = 1, width = 1600) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeWidth = Math.min(3200, Math.max(240, Number(width) || 1600));
  return `f_jpg,pg_${safePage},q_auto,c_limit,w_${safeWidth}`;
}

export function withCloudinaryTransform(url, transform) {
  if (!url || !transform) return url || "";
  const parsed = parseDelivery(url);
  if (!parsed) return url;
  return `${parsed.origin}/image/upload/${transform}/${stripDeliveryTransforms(parsed.rest)}`;
}

export function cloudinaryPageUrl(file, page = 1, { width = 1600 } = {}) {
  const transform = pageTransform(page, width);
  const origin = originFromFile(file);
  const publicId = publicIdFromFile(file);
  if (origin && publicId) {
    return `${origin}/image/upload/${transform}/${publicId}.jpg`;
  }
  const url = file?.url || "";
  if (!url) return "";
  return withCloudinaryTransform(url, transform).replace(/\.pdf(\?|#|$)/i, ".jpg$1");
}

export function optimizedImageUrl(file, { width = 1600 } = {}) {
  const url = file?.url || "";
  if (!url) return "";
  const safeWidth = Math.min(3200, Math.max(240, Number(width) || 1600));
  return withCloudinaryTransform(url, `q_auto,c_limit,w_${safeWidth}`) || url;
}

export function previewUrl(file, page = 1, options = {}) {
  if (!file?.url && !file?.publicId) return "";
  if (isPdfFile(file)) return cloudinaryPageUrl(file, page, options);
  if (isImageFile(file) || file.resourceType === "image") return optimizedImageUrl(file, options);
  return file.url || "";
}

export function previewCandidates(file, page = 1, options = {}) {
  const urls = [];
  const seen = new Set();
  function add(url) {
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  }
  add(previewUrl(file, page, options));
  if (isPdfFile(file)) {
    const parsed = parseDelivery(file?.url);
    if (parsed) {
      const transform = pageTransform(page, options.width);
      const rest = stripDeliveryTransforms(parsed.rest);
      add(`${parsed.origin}/image/upload/${transform}/${rest.replace(/\.pdf(\?|#|$)/i, ".jpg$1")}`);
      add(`${parsed.origin}/image/upload/${transform}/${rest}`);
    }
  }
  return urls;
}

export function thumbnailUrl(file, page = 1) {
  return previewUrl(file, page, { width: 240 });
}

export function preloadUrl(url) {
  if (!url || typeof window === "undefined" || preloaded.has(url)) return;
  preloaded.add(url);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
}

export function probeImage(url) {
  return new Promise((resolve) => {
    if (!url || typeof window === "undefined") {
      resolve(false);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
    if (image.complete && image.naturalWidth > 0) resolve(true);
  });
}

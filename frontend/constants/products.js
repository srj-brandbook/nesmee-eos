export const PRODUCT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "in_verification", label: "In verification" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Returned" },
  { value: "archived", label: "Archived" },
];

export const PRODUCT_LISTING_STATUSES = [
  { value: "unlisted", label: "Unlisted" },
  { value: "listed", label: "Listed" },
];

export const PRODUCT_MEASUREMENT_DIMENSIONS = [
  { value: "weight", label: "Weight" },
  { value: "volume", label: "Volume" },
  { value: "length", label: "Length" },
  { value: "area", label: "Area" },
  { value: "count", label: "Count" },
  { value: "time", label: "Time" },
  { value: "custom", label: "Custom" },
];

export const PRODUCT_UNIT_PRESETS = ["kg", "g", "MT", "L", "ml", "pcs", "dozen", "m", "cm", "mm", "sqm", "carton", "pallet", "kWh", "unit"];

export const PRODUCT_MEDIA_KINDS = [
  { value: "photo", label: "Photo" },
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
];

export const PRODUCT_MEDIA_ROLES = [
  { value: "hero", label: "Hero" },
  { value: "gallery", label: "Gallery" },
  { value: "packaging", label: "Packaging" },
  { value: "datasheet", label: "Datasheet" },
  { value: "brochure", label: "Brochure" },
  { value: "other", label: "Other" },
];

export const MEASUREMENT_PRESETS = [
  { name: "Net weight", dimension: "weight", unit: "kg" },
  { name: "Gross weight", dimension: "weight", unit: "kg" },
  { name: "Volume", dimension: "volume", unit: "L" },
  { name: "Length", dimension: "length", unit: "cm" },
  { name: "Pack count", dimension: "count", unit: "pcs" },
];

export function labelFor(list, value) {
  return list.find((item) => item.value === value)?.label || value || "—";
}

export function productStatusVariant(status) {
  if (status === "verified" || status === "listed") return "success";
  if (status === "in_verification" || status === "draft") return "warning";
  if (status === "rejected" || status === "archived") return "danger";
  return "default";
}

export function listingStatusVariant(status) {
  if (status === "listed") return "success";
  return "default";
}

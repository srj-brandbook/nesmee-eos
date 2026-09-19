function idOf(value) {
  if (!value) return null;
  if (typeof value === "object") return String(value._id || value.id);
  return String(value);
}

function serializePerson(value) {
  if (!value || typeof value !== "object" || !value.name) return null;
  return {
    id: String(value._id || value.id),
    name: value.name,
    email: value.email || "",
    avatarUrl: value.avatarUrl || "",
  };
}

function serializeSupplier(value) {
  if (!value || typeof value !== "object") return null;
  const id = value._id || value.id;
  if (!id) return null;
  return {
    id: String(id),
    name: value.name || "",
    legalName: value.legalName || "",
    stage: value.stage || "",
    verificationStatus: value.verificationStatus || "none",
    country: value.country || "",
    city: value.city || "",
  };
}

function serializeFile(file = {}) {
  return {
    url: file.url || "",
    publicId: file.publicId || "",
    name: file.name || "",
    size: Number(file.size) || 0,
    mimeType: file.mimeType || file.type || "",
    type: file.type || file.mimeType || "",
    resourceType: file.resourceType || "",
    format: file.format || "",
    pages: Number(file.pages) || 0,
    duration: Number(file.duration) || 0,
    uploadedAt: file.uploadedAt || null,
    uploadedBy: idOf(file.uploadedBy),
  };
}

function heroOf(media = []) {
  const ordered = [...media].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const hero = ordered.find((item) => item.role === "hero" && item.file?.url) || ordered.find((item) => item.kind === "photo" && item.file?.url);
  return hero ? serializeFile(hero.file) : null;
}

function serializeProduct(item, extras = {}, hideFinance = false) {
  const source = item.toObject ? item.toObject() : item;
  const identifiers = source.identifiers || {};
  const doc = {
    id: String(source._id),
    supplierId: idOf(source.supplierId),
    supplier: extras.supplier || serializeSupplier(source.supplierId),
    name: source.name,
    brand: source.brand || "",
    originCountry: source.originCountry || "",
    category: source.category || "",
    tags: source.tags || [],
    sku: source.sku || "",
    hsCode: source.hsCode || "",
    unit: source.unit || "unit",
    identifiers: {
      gtin: identifiers.gtin || "",
      barcode: identifiers.barcode || "",
      other: identifiers.other || [],
    },
    measurements: source.measurements || [],
    attributes: source.attributes || [],
    description: source.description || "",
    highlights: source.highlights || [],
    packagingNotes: source.packagingNotes || "",
    moq: source.moq || { value: 0, unit: "" },
    leadTimeDays: source.leadTimeDays || 0,
    incotermCode: source.incotermCode || "",
    media: (source.media || []).map((entry) => ({
      id: entry._id ? String(entry._id) : undefined,
      kind: entry.kind || "photo",
      role: entry.role || "gallery",
      caption: entry.caption || "",
      sortOrder: entry.sortOrder || 0,
      file: serializeFile(entry.file || {}),
    })),
    thumbnail: heroOf(source.media || []),
    status: source.status,
    listingStatus: source.listingStatus || "unlisted",
    verificationStatus: source.verificationStatus || "none",
    verificationSummary: source.verificationSummary || {
      required: 0,
      verified: 0,
      pending: 0,
      expired: 0,
      expiringSoon: 0,
    },
    listedAt: source.listedAt || null,
    listedBy: extras.listedBy || serializePerson(source.listedBy),
    origin: source.origin || "catalog",
    notes: source.notes || "",
    customFields: source.customFields || {},
    ownerId: idOf(source.ownerId),
    owner: extras.owner || serializePerson(source.ownerId),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
  if (!hideFinance) {
    doc.indicativePrice = source.indicativePrice || source.baseCost || 0;
    doc.currency = source.currency || source.baseCurrency || "INR";
    doc.baseCost = source.baseCost || source.indicativePrice || 0;
    doc.baseCurrency = source.baseCurrency || source.currency || "INR";
  }
  if (extras.shares) doc.shares = extras.shares;
  return doc;
}

function serializeShare(item, extras = {}) {
  const source = item.toObject ? item.toObject() : item;
  return {
    id: String(source._id),
    productId: idOf(source.productId),
    product: extras.product || null,
    buyerId: idOf(source.buyerId),
    buyer: extras.buyer || (source.buyerId?.name ? { id: idOf(source.buyerId), name: source.buyerId.name } : null),
    status: source.status,
    note: source.note || "",
    sharedBy: extras.sharedBy || serializePerson(source.sharedBy),
    sharedAt: source.sharedAt || source.createdAt,
    revokedAt: source.revokedAt || null,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

module.exports = { idOf, serializePerson, serializeSupplier, serializeProduct, serializeShare, serializeFile };

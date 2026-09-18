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

function serializeLeadRef(value) {
  if (!value || typeof value !== "object" || !value.name) return null;
  return { id: String(value._id || value.id), name: value.name, email: value.email || "", stage: value.stage };
}

function serializeContact(contact) {
  const source = typeof contact.toObject === "function" ? contact.toObject() : contact;
  return {
    id: String(source._id),
    leadId: idOf(source.leadId),
    name: source.name,
    role: source.role || "",
    email: source.email || "",
    phone: source.phone || "",
    isPrimary: Boolean(source.isPrimary),
    notes: source.notes || "",
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeLead(lead, contacts = []) {
  const source = typeof lead.toObject === "function" ? lead.toObject() : lead;
  const primary = contacts.find((contact) => contact.isPrimary) || contacts[0] || null;
  return {
    id: String(source._id),
    name: source.name,
    legalName: source.legalName || "",
    email: source.email || "",
    phone: source.phone || "",
    website: source.website || "",
    country: source.country || "",
    city: source.city || "",
    products: source.products || "",
    certifications: source.certifications || "",
    moq: source.moq || "",
    exportMarkets: source.exportMarkets || "",
    source: source.source,
    stage: source.stage,
    score: source.score || 0,
    ownerId: idOf(source.ownerId),
    owner: serializePerson(source.ownerId),
    verificationStatus: source.verificationStatus || "none",
    verificationSummary: source.verificationSummary || {
      required: 0,
      verified: 0,
      pending: 0,
      expired: 0,
      expiringSoon: 0,
    },
    gstin: source.gstin || "",
    billingState: source.billingState || "",
    billingAddress: source.billingAddress || "",
    pincode: source.pincode || "",
    notes: source.notes || "",
    convertedAt: source.convertedAt,
    wonAt: source.wonAt,
    lostAt: source.lostAt,
    lostReason: source.lostReason || "",
    disqualifiedAt: source.disqualifiedAt,
    disqualifiedReason: source.disqualifiedReason || "",
    contacts,
    primaryContact: primary,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeActivity(activity) {
  const source = typeof activity.toObject === "function" ? activity.toObject() : activity;
  return {
    id: String(source._id),
    type: source.type,
    title: source.title || "",
    body: source.body || "",
    leadId: idOf(source.leadId),
    lead: serializeLeadRef(source.leadId),
    contactId: idOf(source.contactId),
    contact: source.contactId && source.contactId.name ? serializeContact(source.contactId) : null,
    assignedToId: idOf(source.assignedToId),
    assignedTo: serializePerson(source.assignedToId),
    startsAt: source.startsAt,
    endsAt: source.endsAt,
    location: source.location || "",
    meetingUrl: source.meetingUrl || "",
    dueAt: source.dueAt,
    reminderAt: source.reminderAt,
    remindedAt: source.remindedAt,
    status: source.status,
    externalProvider: source.externalProvider,
    externalEventId: source.externalEventId,
    externalSyncStatus: source.externalSyncStatus,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

module.exports = { serializeLead, serializeContact, serializeActivity };

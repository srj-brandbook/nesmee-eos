function idOf(value) {
  if (!value) return null;
  if (typeof value === "object") return String(value._id || value.id);
  return String(value);
}

function serializePerson(value) {
  if (!value || typeof value !== "object" || !(value.name || value.email)) return null;
  return {
    id: String(value._id || value.id),
    name: value.name || "",
    email: value.email || "",
    avatarUrl: value.avatarUrl || "",
  };
}

function serializeParty(party = {}) {
  if (!party || typeof party !== "object") {
    return {
      name: "",
      legalName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      gstin: "",
      country: "India",
    };
  }
  return {
    name: party.name || "",
    legalName: party.legalName || party.name || "",
    email: party.email || "",
    phone: party.phone || "",
    address: party.address || "",
    city: party.city || "",
    state: party.state || "",
    pincode: party.pincode || "",
    gstin: party.gstin || "",
    country: party.country || "India",
  };
}

function serializeLeadRef(value) {
  if (!value || typeof value !== "object") return null;
  if (!value.name && !value._id && !value.id) return null;
  return {
    id: String(value._id || value.id),
    name: value.name || "",
    email: value.email || "",
    stage: value.stage || "",
    gstin: value.gstin || "",
    billingState: value.billingState || "",
  };
}

function serializeTaxRate(rate) {
  if (!rate) return null;
  const source = typeof rate.toObject === "function" ? rate.toObject() : rate;
  if (!source._id && !source.id) return null;
  return {
    id: String(source._id || source.id),
    name: source.name,
    code: source.code,
    rate: Number(source.rate) || 0,
    isActive: source.isActive !== false,
    isDefault: Boolean(source.isDefault),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeSettings(settings) {
  const source = typeof settings.toObject === "function" ? settings.toObject() : settings;
  return {
    legalName: source.legalName || "",
    address: source.address || "",
    city: source.city || "",
    state: source.state || "",
    pincode: source.pincode || "",
    gstin: source.gstin || "",
    pan: source.pan || "",
    email: source.email || "",
    phone: source.phone || "",
    logoUrl: source.logoUrl || "",
    currency: source.currency || "INR",
    invoicePrefix: source.invoicePrefix || "INV",
    creditNotePrefix: source.creditNotePrefix || "CN",
    jobPrefix: source.jobPrefix || "JOB",
    paymentPrefix: source.paymentPrefix || "PAY",
    invoiceNextNumber: Number(source.invoiceNextNumber) || 0,
    creditNoteNextNumber: Number(source.creditNoteNextNumber) || 0,
    jobNextNumber: Number(source.jobNextNumber) || 0,
    paymentNextNumber: Number(source.paymentNextNumber) || 0,
    defaultDueDays: Number(source.defaultDueDays) || 15,
    defaultTaxRateId: idOf(source.defaultTaxRateId),
    defaultTaxRate: source.defaultTaxRateId && source.defaultTaxRateId.name ? serializeTaxRate(source.defaultTaxRateId) : null,
    paymentTerms: source.paymentTerms || "",
    bankName: source.bankName || "",
    bankAccount: source.bankAccount || "",
    bankIfsc: source.bankIfsc || "",
    upiId: source.upiId || "",
    paymentFooter: source.paymentFooter || "",
    reminderDays: Array.isArray(source.reminderDays) ? source.reminderDays : [0, 7, 14],
    updatedAt: source.updatedAt,
  };
}

function serializeOffering(item) {
  const source = typeof item.toObject === "function" ? item.toObject() : item;
  return {
    id: String(source._id),
    code: source.code,
    name: source.name,
    category: source.category,
    description: source.description || "",
    isActive: source.isActive !== false,
    unitPrice: Number(source.unitPrice) || 0,
    costPrice: Number(source.costPrice) || 0,
    currency: source.currency || "INR",
    taxRateId: idOf(source.taxRateId),
    taxRate: source.taxRateId && source.taxRateId.name ? serializeTaxRate(source.taxRateId) : null,
    slaDays: Number(source.slaDays) || 0,
    formDefinitionId: idOf(source.formDefinitionId),
    form: source.formDefinitionId && source.formDefinitionId.name
      ? { id: String(source.formDefinitionId._id || source.formDefinitionId.id), name: source.formDefinitionId.name }
      : null,
    documentKey: source.documentKey || "",
    hsnSac: source.hsnSac || "",
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeLine(line = {}) {
  return {
    id: line._id ? String(line._id) : null,
    offeringId: idOf(line.offeringId),
    documentKey: line.documentKey || "",
    formDefinitionId: idOf(line.formDefinitionId),
    description: line.description || "",
    hsnSac: line.hsnSac || "",
    quantity: Number(line.quantity) || 0,
    unitPrice: Number(line.unitPrice) || 0,
    discount: Number(line.discount) || 0,
    taxRateId: idOf(line.taxRateId),
    taxRate: Number(line.taxRate) || 0,
    taxName: line.taxName || "",
    taxableAmount: Number(line.taxableAmount) || 0,
    cgst: Number(line.cgst) || 0,
    sgst: Number(line.sgst) || 0,
    igst: Number(line.igst) || 0,
    taxAmount: Number(line.taxAmount) || 0,
    lineTotal: Number(line.lineTotal) || 0,
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
    uploadedAt: file.uploadedAt || null,
    uploadedBy: idOf(file.uploadedBy),
  };
}

function serializeJob(job) {
  const source = typeof job.toObject === "function" ? job.toObject() : job;
  return {
    id: String(source._id),
    jobNumber: source.jobNumber,
    leadId: idOf(source.leadId),
    lead: serializeLeadRef(source.leadId),
    assigneeId: idOf(source.assigneeId),
    assignee: serializePerson(source.assigneeId),
    status: source.status,
    source: source.source,
    dueAt: source.dueAt,
    notes: source.notes || "",
    verificationCaseId: idOf(source.verificationCaseId),
    invoiceId: idOf(source.invoiceId),
    lines: (source.lines || []).map(serializeLine),
    taxableAmount: Number(source.taxableAmount) || 0,
    cgst: Number(source.cgst) || 0,
    sgst: Number(source.sgst) || 0,
    igst: Number(source.igst) || 0,
    taxAmount: Number(source.taxAmount) || 0,
    discount: Number(source.discount) || 0,
    grandTotal: Number(source.grandTotal) || 0,
    currency: source.currency || "INR",
    taxSplit: source.taxSplit || "intra",
    history: (source.history || []).map((event) => ({
      action: event.action,
      note: event.note || "",
      actorId: idOf(event.actorId),
      createdAt: event.createdAt,
    })),
    waivePayment: Boolean(source.waivePayment),
    deliveredAt: source.deliveredAt,
    closedAt: source.closedAt,
    cancelledAt: source.cancelledAt,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeInvoice(invoice) {
  const source = typeof invoice.toObject === "function" ? invoice.toObject() : invoice;
  return {
    id: String(source._id),
    invoiceNumber: source.invoiceNumber || "",
    type: source.type,
    status: source.status,
    leadId: idOf(source.leadId),
    lead: serializeLeadRef(source.leadId),
    jobId: idOf(source.jobId),
    originalInvoiceId: idOf(source.originalInvoiceId),
    billTo: serializeParty(source.billTo),
    placeOfSupply: source.placeOfSupply || "",
    taxSplit: source.taxSplit || "intra",
    lines: (source.lines || []).map(serializeLine),
    taxableAmount: Number(source.taxableAmount) || 0,
    cgst: Number(source.cgst) || 0,
    sgst: Number(source.sgst) || 0,
    igst: Number(source.igst) || 0,
    taxAmount: Number(source.taxAmount) || 0,
    discount: Number(source.discount) || 0,
    grandTotal: Number(source.grandTotal) || 0,
    amountPaid: Number(source.amountPaid) || 0,
    amountCredited: Number(source.amountCredited) || 0,
    amountDue: Number(source.amountDue) || 0,
    currency: source.currency || "INR",
    issuedAt: source.issuedAt,
    dueAt: source.dueAt,
    paidAt: source.paidAt,
    voidedAt: source.voidedAt,
    notes: source.notes || "",
    paymentTerms: source.paymentTerms || "",
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeInstrument(instrument = {}) {
  const source = instrument && typeof instrument === "object" ? instrument : {};
  return {
    transactionId: source.transactionId || "",
    bankName: source.bankName || "",
    ifsc: source.ifsc || "",
    accountName: source.accountName || "",
    upiVpa: source.upiVpa || "",
    chequeNumber: source.chequeNumber || "",
    chequeDate: source.chequeDate || null,
    chequeBank: source.chequeBank || "",
    depositedTo: source.depositedTo || "",
  };
}

function serializePayment(payment) {
  const source = typeof payment.toObject === "function" ? payment.toObject() : payment;
  return {
    id: String(source._id),
    paymentNumber: source.paymentNumber,
    invoiceId: idOf(source.invoiceId),
    invoiceNumber: source.invoiceNumber || source.invoiceId?.invoiceNumber || "",
    invoice:
      source.invoiceId && source.invoiceId.invoiceNumber
        ? {
            id: String(source.invoiceId._id || source.invoiceId.id),
            invoiceNumber: source.invoiceId.invoiceNumber,
            status: source.invoiceId.status,
            grandTotal: source.invoiceId.grandTotal,
            amountDue: source.invoiceId.amountDue,
            amountPaid: source.invoiceId.amountPaid,
            currency: source.invoiceId.currency || source.currency || "INR",
            billTo: serializeParty(source.invoiceId.billTo),
          }
        : null,
    leadId: idOf(source.leadId),
    lead: serializeLeadRef(source.leadId),
    amount: Number(source.amount) || 0,
    currency: source.currency || "INR",
    method: source.method,
    paidAt: source.paidAt,
    reference: source.reference || "",
    notes: source.notes || "",
    receivedFrom: serializeParty(source.receivedFrom),
    instrument: serializeInstrument(source.instrument),
    receivedBy: source.receivedBy || "",
    invoiceTotal: source.invoiceTotal == null ? Number(source.invoiceId?.grandTotal) || 0 : Number(source.invoiceTotal),
    amountDueBefore: source.amountDueBefore == null ? null : Number(source.amountDueBefore),
    amountDueAfter: source.amountDueAfter == null ? null : Number(source.amountDueAfter),
    files: (source.files || []).map(serializeFile),
    status: source.status,
    reversedAt: source.reversedAt,
    reversedBy: serializePerson(source.reversedBy),
    recordedBy: serializePerson(source.createdBy),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

module.exports = {
  serializeSettings,
  serializeTaxRate,
  serializeOffering,
  serializeJob,
  serializeInvoice,
  serializePayment,
  serializeLine,
};

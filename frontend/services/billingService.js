import { apiClient } from "@/lib/api/apiClient";

function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const billingService = {
  settings: () => apiClient("/billing/settings"),
  updateSettings: (body) => apiClient("/billing/settings", { method: "PATCH", body }),
  summary: () => apiClient("/billing/reports/summary"),

  listTaxRates: (params) => apiClient(`/billing/tax-rates${qs(params)}`),
  createTaxRate: (body) => apiClient("/billing/tax-rates", { method: "POST", body }),
  updateTaxRate: (id, body) => apiClient(`/billing/tax-rates/${id}`, { method: "PATCH", body }),
  removeTaxRate: (id) => apiClient(`/billing/tax-rates/${id}`, { method: "DELETE" }),

  listServices: (params) => apiClient(`/billing/services${qs(params)}`),
  getService: (id) => apiClient(`/billing/services/${id}`),
  createService: (body) => apiClient("/billing/services", { method: "POST", body }),
  updateService: (id, body) => apiClient(`/billing/services/${id}`, { method: "PATCH", body }),
  removeService: (id) => apiClient(`/billing/services/${id}`, { method: "DELETE" }),

  listJobs: (params) => apiClient(`/billing/jobs${qs(params)}`),
  jobGaps: (leadId) => apiClient(`/billing/jobs/gaps${qs({ leadId })}`),
  getJob: (id) => apiClient(`/billing/jobs/${id}`),
  createJob: (body) => apiClient("/billing/jobs", { method: "POST", body }),
  updateJob: (id, body) => apiClient(`/billing/jobs/${id}`, { method: "PATCH", body }),
  confirmJob: (id, body = {}) => apiClient(`/billing/jobs/${id}/confirm`, { method: "POST", body }),
  startJob: (id, body = {}) => apiClient(`/billing/jobs/${id}/start`, { method: "POST", body }),
  awaitAuthority: (id, body = {}) => apiClient(`/billing/jobs/${id}/await-authority`, { method: "POST", body }),
  deliverJob: (id, body = {}) => apiClient(`/billing/jobs/${id}/deliver`, { method: "POST", body }),
  closeJob: (id, body = {}) => apiClient(`/billing/jobs/${id}/close`, { method: "POST", body }),
  cancelJob: (id, body = {}) => apiClient(`/billing/jobs/${id}/cancel`, { method: "POST", body }),

  listInvoices: (params) => apiClient(`/billing/invoices${qs(params)}`),
  getInvoice: (id) => apiClient(`/billing/invoices/${id}`),
  printInvoice: (id) => apiClient(`/billing/invoices/${id}/print`),
  createInvoice: (body) => apiClient("/billing/invoices", { method: "POST", body }),
  updateInvoice: (id, body) => apiClient(`/billing/invoices/${id}`, { method: "PATCH", body }),
  issueInvoice: (id) => apiClient(`/billing/invoices/${id}/issue`, { method: "POST", body: {} }),
  voidInvoice: (id) => apiClient(`/billing/invoices/${id}/void`, { method: "POST", body: {} }),
  creditNote: (id, body = {}) => apiClient(`/billing/invoices/${id}/credit-note`, { method: "POST", body }),

  listPayments: (params) => apiClient(`/billing/payments${qs(params)}`),
  getPayment: (id) => apiClient(`/billing/payments/${id}`),
  printPayment: (id) => apiClient(`/billing/payments/${id}/print`),
  createPayment: (body) => apiClient("/billing/payments", { method: "POST", body }),
  reversePayment: (id) => apiClient(`/billing/payments/${id}/reverse`, { method: "POST", body: {} }),
};

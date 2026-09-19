import { apiClient } from "@/lib/api/apiClient";

function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const verificationService = {
  list: (params) => apiClient(`/verification${qs(params)}`),
  templates: (params) => apiClient(`/verification/templates${qs(params)}`),
  assignees: () => apiClient("/verification/assignees"),
  summary: (leadId) => apiClient(`/verification/leads/${leadId}/summary`),
  productSummary: (productId) => apiClient(`/verification/products/${productId}/summary`),
  get: (id) => apiClient(`/verification/${id}`),
  create: (body) => apiClient("/verification", { method: "POST", body }),
  saveDraft: (id, body) => apiClient(`/verification/${id}`, { method: "PATCH", body }),
  submit: (id, body) => apiClient(`/verification/${id}/submit`, { method: "POST", body }),
  reassign: (id, body) => apiClient(`/verification/${id}/assign`, { method: "PATCH", body }),
  cancel: (id, body = {}) => apiClient(`/verification/${id}/cancel`, { method: "POST", body }),
  updateDocument: (id, body) => apiClient(`/verification/documents/${id}`, { method: "PATCH", body }),
  reviewDocument: (id, body) => apiClient(`/verification/documents/${id}/review`, { method: "POST", body }),
  reviewCase: (id, body) => apiClient(`/verification/${id}/review`, { method: "POST", body }),
};

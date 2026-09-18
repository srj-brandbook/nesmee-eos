import { apiClient } from "@/lib/api/apiClient";

function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const formService = {
  list: (params) => apiClient(`/forms${qs(params)}`),
  get: (id) => apiClient(`/forms/${id}`),
  create: (body) => apiClient("/forms", { method: "POST", body }),
  update: (id, body) => apiClient(`/forms/${id}`, { method: "PATCH", body }),
  remove: (id) => apiClient(`/forms/${id}`, { method: "DELETE" }),
  saveDraft: (id, body) => apiClient(`/forms/${id}/draft`, { method: "PATCH", body }),
  createDraft: (id) => apiClient(`/forms/${id}/draft`, { method: "POST", body: {} }),
  publish: (id, body = {}) => apiClient(`/forms/${id}/publish`, { method: "POST", body }),
  validateConfig: (id) => apiClient(`/forms/${id}/validate-config`, { method: "POST", body: {} }),
  testRule: (id, body) => apiClient(`/forms/${id}/rules/test`, { method: "POST", body }),
  submit: (id, body) => apiClient(`/forms/${id}/submissions`, { method: "POST", body }),
  submissions: (id, params) => apiClient(`/forms/${id}/submissions${qs(params)}`),
  onboarding: {
    list: (params) => apiClient(`/forms/onboarding${qs(params)}`),
    get: (id) => apiClient(`/forms/onboarding/${id}`),
    subject: (subjectType, subjectId) => apiClient(`/forms/onboarding/subject/${subjectType}/${subjectId}`),
    saveDraft: (id, body) => apiClient(`/forms/onboarding/${id}`, { method: "PATCH", body }),
    submit: (id, body) => apiClient(`/forms/onboarding/${id}/submit`, { method: "POST", body }),
    review: (id, body) => apiClient(`/forms/onboarding/${id}/review`, { method: "POST", body }),
  },
};

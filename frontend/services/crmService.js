import { apiClient } from "@/lib/api/apiClient";

function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const leadService = {
  list: (params) => apiClient(`/leads${qs(params)}`),
  get: (id) => apiClient(`/leads/${id}`),
  create: (body) => apiClient("/leads", { method: "POST", body }),
  update: (id, body) => apiClient(`/leads/${id}`, { method: "PATCH", body }),
  convert: (id, body) => apiClient(`/leads/${id}/convert`, { method: "POST", body }),
  startOnboarding: (id) => apiClient(`/leads/${id}/onboarding`, { method: "POST", body: {} }),
  remove: (id) => apiClient(`/leads/${id}`, { method: "DELETE" }),
  assignees: () => apiClient("/leads/assignees"),
  dashboard: () => apiClient("/leads/dashboard"),
  addContact: (leadId, body) => apiClient(`/leads/${leadId}/contacts`, { method: "POST", body }),
  updateContact: (leadId, contactId, body) =>
    apiClient(`/leads/${leadId}/contacts/${contactId}`, { method: "PATCH", body }),
  removeContact: (leadId, contactId) => apiClient(`/leads/${leadId}/contacts/${contactId}`, { method: "DELETE" }),
};

export const activityService = {
  list: (params) => apiClient(`/activities${qs(params)}`),
  get: (id) => apiClient(`/activities/${id}`),
  create: (body) => apiClient("/activities", { method: "POST", body }),
  update: (id, body) => apiClient(`/activities/${id}`, { method: "PATCH", body }),
  remove: (id) => apiClient(`/activities/${id}`, { method: "DELETE" }),
};

export const calendarService = {
  list: (params) => apiClient(`/calendar${qs(params)}`),
};

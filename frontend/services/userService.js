import { apiClient } from "@/lib/api/apiClient";

function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const userService = {
  list: (params) => apiClient(`/users${qs(params)}`),
  get: (id) => apiClient(`/users/${id}`),
  create: (body) => apiClient("/users", { method: "POST", body }),
  update: (id, body) => apiClient(`/users/${id}`, { method: "PATCH", body }),
  remove: (id) => apiClient(`/users/${id}`, { method: "DELETE" }),
  activate: (id) => apiClient(`/users/${id}/activate`, { method: "POST" }),
  deactivate: (id) => apiClient(`/users/${id}/deactivate`, { method: "POST" }),
  resetPassword: (id) => apiClient(`/users/${id}/reset-password`, { method: "POST" }),
  sessions: (id) => apiClient(`/users/${id}/sessions`),
};

import { apiClient } from "@/lib/api/apiClient";

export const roleService = {
  list: (params = {}) => {
    const search = new URLSearchParams(params).toString();
    return apiClient(`/roles${search ? `?${search}` : ""}`);
  },
  get: (id) => apiClient(`/roles/${id}`),
  create: (body) => apiClient("/roles", { method: "POST", body }),
  update: (id, body) => apiClient(`/roles/${id}`, { method: "PATCH", body }),
  setPermissions: (id, permissionIds) => apiClient(`/roles/${id}/permissions`, { method: "PUT", body: { permissionIds } }),
  remove: (id) => apiClient(`/roles/${id}`, { method: "DELETE" }),
};

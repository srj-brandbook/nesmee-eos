import { apiClient } from "@/lib/api/apiClient";

export const sessionService = {
  list: () => apiClient("/sessions"),
  revoke: (id) => apiClient(`/sessions/${id}`, { method: "DELETE" }),
  revokeAll: () => apiClient("/sessions", { method: "DELETE" }),
};

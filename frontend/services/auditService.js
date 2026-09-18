import { apiClient } from "@/lib/api/apiClient";

export const auditService = {
  list: (params = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) search.set(key, value);
    });
    const query = search.toString();
    return apiClient(`/audit-logs${query ? `?${query}` : ""}`);
  },
};

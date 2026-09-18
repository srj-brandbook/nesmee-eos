import { apiClient } from "@/lib/api/apiClient";

export const settingsService = {
  get: () => apiClient("/settings"),
  update: (body) => apiClient("/settings", { method: "PATCH", body }),
};

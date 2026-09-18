import { apiClient } from "@/lib/api/apiClient";

export const profileService = {
  get: () => apiClient("/profile"),
  update: (body) => apiClient("/profile", { method: "PATCH", body }),
};

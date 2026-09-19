import { apiClient } from "@/lib/api/apiClient";

export const dashboardService = {
  overview: () => apiClient("/dashboard"),
};

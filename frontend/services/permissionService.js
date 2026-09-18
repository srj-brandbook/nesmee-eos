import { apiClient } from "@/lib/api/apiClient";

export const permissionService = {
  list: () => apiClient("/permissions"),
};

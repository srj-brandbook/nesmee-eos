import { apiClient } from "@/lib/api/apiClient";

export const notificationService = {
  list: (params = {}) => {
    const search = new URLSearchParams(params).toString();
    return apiClient(`/notifications${search ? `?${search}` : ""}`);
  },
  markRead: (id) => apiClient(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => apiClient("/notifications/mark-all-read", { method: "POST" }),
};

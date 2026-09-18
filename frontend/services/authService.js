import { apiClient } from "@/lib/api/apiClient";

export const authService = {
  signup: (body) => apiClient("/auth/signup", { method: "POST", body }),
  login: (body) => apiClient("/auth/login", { method: "POST", body }),
  logout: () => apiClient("/auth/logout", { method: "POST" }),
  me: () => apiClient("/auth/me"),
  refresh: () => apiClient("/auth/refresh", { method: "POST" }),
  verifyEmail: (token) => apiClient("/auth/verify-email", { method: "POST", body: { token } }),
  resendVerification: (email) => apiClient("/auth/resend-verification", { method: "POST", body: { email } }),
  forgotPassword: (email) => apiClient("/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (body) => apiClient("/auth/reset-password", { method: "POST", body }),
  changePassword: (body) => apiClient("/auth/change-password", { method: "POST", body }),
};

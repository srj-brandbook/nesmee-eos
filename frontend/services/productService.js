import { apiClient } from "@/lib/api/apiClient";

function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const productService = {
  list: (params) => apiClient(`/products${qs(params)}`),
  get: (id) => apiClient(`/products/${id}`),
  create: (body) => apiClient("/products", { method: "POST", body }),
  update: (id, body) => apiClient(`/products/${id}`, { method: "PATCH", body }),
  remove: (id) => apiClient(`/products/${id}`, { method: "DELETE" }),
  listToCatalog: (id) => apiClient(`/products/${id}/list`, { method: "POST" }),
  unlist: (id) => apiClient(`/products/${id}/unlist`, { method: "POST" }),
  archive: (id) => apiClient(`/products/${id}/archive`, { method: "POST" }),
  shares: (id, params) => apiClient(`/products/${id}/shares${qs(params)}`),
  share: (id, body) => apiClient(`/products/${id}/shares`, { method: "POST", body }),
  revokeShare: (id, shareId) => apiClient(`/products/${id}/shares/${shareId}/revoke`, { method: "POST" }),
  listShares: (params) => apiClient(`/products/shares${qs(params)}`),
  suppliers: (params) => apiClient(`/products/suppliers${qs(params)}`),
  distributors: (params) => apiClient(`/products/distributors${qs(params)}`),
  categories: () => apiClient("/products/categories"),
};

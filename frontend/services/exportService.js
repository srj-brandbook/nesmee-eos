import { apiClient } from "@/lib/api/apiClient";

function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

const resource = (path) => ({
  list: (params) => apiClient(`${path}${qs(params)}`),
  get: (id) => apiClient(`${path}/${id}`),
  create: (body) => apiClient(path, { method: "POST", body }),
  update: (id, body) => apiClient(`${path}/${id}`, { method: "PATCH", body }),
  remove: (id) => apiClient(`${path}/${id}`, { method: "DELETE" }),
});

export const exportService = {
  dashboard: () => apiClient("/export/dashboard"),
  analytics: (params) => apiClient(`/export/analytics${qs(params)}`),
  assignees: () => apiClient("/export/assignees"),
  settings: {
    get: () => apiClient("/export/settings"),
    update: (body) => apiClient("/export/settings", { method: "PATCH", body }),
  },
  lookups: resource("/export/lookups"),
  incoterms: resource("/export/incoterms"),
  scoreProfiles: resource("/export/score-profiles"),
  fxRates: resource("/export/fx-rates"),
  products: resource("/export/products"),
  markets: {
    ...resource("/export/markets"),
    evaluate: (id, body) => apiClient(`/export/markets/${id}/evaluate`, { method: "POST", body }),
    compare: (ids) => apiClient("/export/markets/compare", { method: "POST", body: { ids } }),
    activity: (id, params) => apiClient(`/export/markets/${id}/activity${qs(params)}`),
  },
  mappings: {
    list: (marketId, params) => apiClient(`/export/markets/${marketId}/products${qs(params)}`),
    create: (marketId, body) => apiClient(`/export/markets/${marketId}/products`, { method: "POST", body }),
    update: (marketId, id, body) => apiClient(`/export/markets/${marketId}/products/${id}`, { method: "PATCH", body }),
    remove: (marketId, id) => apiClient(`/export/markets/${marketId}/products/${id}`, { method: "DELETE" }),
  },
  corridors: {
    ...resource("/export/corridors"),
    score: (id, body) => apiClient(`/export/corridors/${id}/score`, { method: "POST", body }),
    compare: (corridorIds) => apiClient("/export/corridors/compare", { method: "POST", body: { corridorIds } }),
    activity: (id, params) => apiClient(`/export/corridors/${id}/activity${qs(params)}`),
  },
  performance: {
    list: (corridorId, params) => apiClient(`/export/corridors/${corridorId}/performance${qs(params)}`),
    create: (corridorId, body) => apiClient(`/export/corridors/${corridorId}/performance`, { method: "POST", body }),
    update: (corridorId, id, body) => apiClient(`/export/corridors/${corridorId}/performance/${id}`, { method: "PATCH", body }),
    remove: (corridorId, id) => apiClient(`/export/corridors/${corridorId}/performance/${id}`, { method: "DELETE" }),
  },
  calculate: (body) => apiClient("/export/calculator/landed-cost", { method: "POST", body }),
  requirements: resource("/export/requirements"),
  rules: {
    ...resource("/export/trade-rules"),
    test: (id, facts) => apiClient(`/export/trade-rules/${id}/test`, { method: "POST", body: { facts } }),
  },
  risks: resource("/export/risks"),
  buyers: {
    ...resource("/export/buyers"),
    startOnboarding: (id) => apiClient(`/export/buyers/${id}/onboarding`, { method: "POST", body: {} }),
  },
  opportunities: {
    ...resource("/export/opportunities"),
    stage: (id, body) => apiClient(`/export/opportunities/${id}/stage`, { method: "PATCH", body }),
  },
  pricing: resource("/export/pricing"),
  alerts: {
    list: (params) => apiClient(`/export/alerts${qs(params)}`),
    read: (id) => apiClient(`/export/alerts/${id}/read`, { method: "POST" }),
  },
  alertRules: resource("/export/alert-rules"),
};

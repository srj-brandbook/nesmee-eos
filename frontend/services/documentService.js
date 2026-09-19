import { apiClient } from "@/lib/api/apiClient";

function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const documentService = {
  variables: (params) => apiClient(`/documents/variables${qs(params)}`),
  previewBindings: (body) => apiClient("/documents/preview-bindings", { method: "POST", body }),
  templates: {
    list: (params) => apiClient(`/documents/templates${qs(params)}`),
    get: (id) => apiClient(`/documents/templates/${id}`),
    create: (body) => apiClient("/documents/templates", { method: "POST", body }),
    update: (id, body) => apiClient(`/documents/templates/${id}`, { method: "PATCH", body }),
    remove: (id) => apiClient(`/documents/templates/${id}`, { method: "DELETE" }),
    saveDraft: (id, body) => apiClient(`/documents/templates/${id}/draft`, { method: "PATCH", body }),
    createDraft: (id) => apiClient(`/documents/templates/${id}/draft`, { method: "POST", body: {} }),
    publish: (id) => apiClient(`/documents/templates/${id}/publish`, { method: "POST", body: {} }),
  },
  list: (params) => apiClient(`/documents${qs(params)}`),
  get: (id) => apiClient(`/documents/${id}`),
  generate: (body) => apiClient("/documents", { method: "POST", body }),
  update: (id, body) => apiClient(`/documents/${id}`, { method: "PATCH", body }),
  remove: (id) => apiClient(`/documents/${id}`, { method: "DELETE" }),
  rebind: (id) => apiClient(`/documents/${id}/rebind`, { method: "POST", body: {} }),
  print: (id) => apiClient(`/documents/${id}/print`),
  issue: (id) => apiClient(`/documents/${id}/issue`, { method: "POST", body: {} }),
  void: (id, body = {}) => apiClient(`/documents/${id}/void`, { method: "POST", body }),
  saveAttachments: (id, body) => apiClient(`/documents/${id}/attachments`, { method: "PATCH", body }),
  packet: (id) => apiClient(`/documents/${id}/packet`, { method: "POST", body: {} }),
  fileUrl: (id, kind = "pdf") => `/api/v1/documents/${id}/files/${kind}`,
};

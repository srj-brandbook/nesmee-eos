import { apiClient, ApiClientError } from "@/lib/api/apiClient";

function uploadWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      let payload = {};
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
        return;
      }
      reject(new Error(payload.error?.message || payload.message || "Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(formData);
  });
}

function toRecord(file, result) {
  return {
    url: result.secure_url,
    publicId: result.public_id,
    name: file.name,
    size: file.size,
    type: file.type || result.format || result.resource_type || "",
    mimeType: file.type || "",
    format: result.format || "",
    pages: Number(result.pages) || 0,
    resourceType: result.resource_type || "image",
  };
}

export const uploadService = {
  signature: (body) => apiClient("/uploads/signature", { method: "POST", body }),
  destroy: (body) => apiClient("/uploads/destroy", { method: "POST", body }),
  async uploadFile(file, { folder, resourceType = "auto", onProgress } = {}) {
    const signed = await uploadService.signature({ folder, resourceType });
    const data = signed.data;
    if (data.maxBytes && file.size > data.maxBytes) {
      throw new Error(`File is larger than ${Math.round(data.maxBytes / (1024 * 1024))} MB`);
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", data.apiKey);
    formData.append("timestamp", String(data.timestamp));
    formData.append("signature", data.signature);
    formData.append("folder", data.folder);
    if (data.publicId) formData.append("public_id", data.publicId);
    const result = await uploadWithProgress(
      `https://api.cloudinary.com/v1_1/${data.cloudName}/${data.resourceType}/upload`,
      formData,
      onProgress
    );
    return toRecord(file, result);
  },
};

export { ApiClientError };

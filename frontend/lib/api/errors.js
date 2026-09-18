export class ApiClientError extends Error {
  constructor({ message, status, code, fields = {} }) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function mapError(payload, status) {
  return new ApiClientError({
    message: payload?.message || "Request failed",
    status,
    code: payload?.error?.code || "INTERNAL",
    fields: payload?.error?.fields || {},
  });
}

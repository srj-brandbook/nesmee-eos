import { apiUrl } from "@/config/env";
import { mapError, ApiClientError } from "./errors";
import { APP_PREFIXES } from "@/constants/routes";

const pending = new Map();
const AUTH_SKIP_REFRESH = new Set([
  "/auth/refresh",
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/resend-verification",
  "/auth/logout",
]);

let refreshInFlight = null;

function getBaseUrl() {
  return apiUrl.replace(/\/$/, "");
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (pathname.startsWith("/login")) return;
  const onApp = APP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!onApp) return;
  const next = encodeURIComponent(pathname + search);
  window.location.assign(`/login?next=${next}`);
}

async function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${getBaseUrl()}/api/v1/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({}),
        });
        if (response.status >= 500) return "error";
        return response.ok ? "ok" : "expired";
      } catch {
        return "error";
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function apiClient(path, { method = "GET", body, signal, retry = false, retriedAuth = false } = {}) {
  const url = `${getBaseUrl()}/api/v1${path}`;
  const key = `${method}:${url}`;
  if (signal) pending.set(key, signal);

  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = { success: false, message: "Invalid server response", error: { code: "INTERNAL", fields: {} } };
  }

  if (response.status === 401) {
    const canRefresh = typeof window !== "undefined" && !retriedAuth && !AUTH_SKIP_REFRESH.has(path);
    if (canRefresh) {
      const result = await refreshSession();
      if (result === "ok") {
        return apiClient(path, { method, body, signal, retry, retriedAuth: true });
      }
      if (result === "expired") {
        redirectToLogin();
      }
    } else if (typeof window !== "undefined" && path !== "/auth/login") {
      redirectToLogin();
    }
  }

  if (!response.ok) {
    if (response.status >= 500 && !retry && method === "GET") {
      return apiClient(path, { method, body, signal, retry: true, retriedAuth });
    }
    throw mapError(payload, response.status);
  }

  return payload;
}

export { ApiClientError };

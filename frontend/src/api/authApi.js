import { apiRequest } from "./apiClient";

export function getSessionStatus() {
  return apiRequest("/auth/session", { method: "GET" });
}

export function loginWithPassword(password) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
    headers: { "Content-Type": "application/json" },
  });
}

import { request } from "./apiClient";

export async function getSession() {
  return request("/authorization/session", { method: "GET", headers: {} });
}

export async function login(loginRequest) {
  return request("/authorization/login", {
    method: "POST",
    body: JSON.stringify(loginRequest),
  });
}

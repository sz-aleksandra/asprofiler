import { request } from "./apiClient";

export async function analyzeFiles(body) {
  return request("/analyze-files", {
    method: "POST",
    body,
    headers: {},
  });
}

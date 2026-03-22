const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}

export async function listFiles() {
  return request("/files");
}

export async function uploadFiles(files) {
  const body = new FormData();
  for (const f of files) body.append("files", f);
  return request("/files", { method: "POST", body });
}

export async function deleteFiles(names) {
  return request("/files", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ names }),
  });
}

export async function analyzeFiles(items, colorMap) {
  return request("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, color_map: colorMap }),
  });
}

export async function getAnalysis(analysisId) {
  return request(`/analyses/${encodeURIComponent(analysisId)}`);
}

export async function listAnalyses() {
  return request("/analyses");
}

export async function deleteAnalysis(analysisId) {
  return request(`/analyses/${encodeURIComponent(analysisId)}`, { method: "DELETE" });
}

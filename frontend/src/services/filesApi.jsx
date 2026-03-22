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

export async function analyzeFiles(files, params, paramsMap) {
  const body = new FormData();
  files.forEach((file) => body.append("files", file));
  body.append(
    "params_json",
    JSON.stringify({
      default: params,
      per_file: Object.fromEntries(
        Object.entries(paramsMap || {}).filter(([, value]) => value && Object.keys(value).length),
      ),
    }),
  );
  return request("/analyze-files", { method: "POST", body });
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function apiRequest(endpointPath, requestOptions) {
  const apiResponse = await fetch(`${API_BASE_URL}${endpointPath}`, {
    credentials: "include",
    ...requestOptions,
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    const apiError = new Error(errorText);
    apiError.status = apiResponse.status;
    throw apiError;
  }

  return apiResponse.json();
}

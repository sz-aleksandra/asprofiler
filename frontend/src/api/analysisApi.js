import { apiRequest } from "./apiClient";

export function postSelectedFilesAnalysis(selectedFilesAnalysisFormData) {
  return apiRequest("/analysis/analyze", {
    method: "POST",
    body: selectedFilesAnalysisFormData,
  });
}

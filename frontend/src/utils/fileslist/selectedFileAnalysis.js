import { postSelectedFilesAnalysis } from "../../api/analysisApi";

import { normalizeGpsCsvFile } from "./normalizeGpsCsv";
export function buildAnalysisFormData(
  selectedFiles,
  getAnalysisParamsForSelectedFile,
  preprocessingParams,
) {
  const analysisFormData = new FormData();
  selectedFiles.forEach((selectedFile) => analysisFormData.append("files", selectedFile));
  analysisFormData.append(
    "params",
    JSON.stringify({
      per_file_params: Object.fromEntries(
        selectedFiles.map((selectedFile) => [
          selectedFile.name,
          getAnalysisParamsForSelectedFile(selectedFile.name),
        ]),
      ),
      preprocessing_params: preprocessingParams,
    }),
  );
  return analysisFormData;
}
export async function analyzeSelectedFiles({
  selectedFiles,
  csvFilterParams,
  getAnalysisParamsForSelectedFile,
  preprocessingParams,
}) {
  const normalizedSelectedFileResults = await Promise.all(
    selectedFiles.map(async (selectedFile) => {
      try {
        return {
          file_name: selectedFile.name,
          file: await normalizeGpsCsvFile(selectedFile, csvFilterParams),
        };
      } catch (normalizeGpsCsvFileError) {
        return {
          file_name: selectedFile.name,
          error: normalizeGpsCsvFileError.message,
        };
      }
    }),
  );
  const normalizedSelectedFiles = normalizedSelectedFileResults
    .filter((normalizedSelectedFileResult) => normalizedSelectedFileResult.file)
    .map((normalizedSelectedFileResult) => normalizedSelectedFileResult.file);
  const normalizedSelectedFileResultsErrors = normalizedSelectedFileResults.filter(
    (normalizedSelectedFileResult) => normalizedSelectedFileResult.error,
  );
  if (!normalizedSelectedFiles.length) {
    throw new Error(
      normalizedSelectedFileResultsErrors
        .map(
          (normalizedSelectedFileResult) =>
            `${normalizedSelectedFileResult.file_name} (${normalizedSelectedFileResult.error})`,
        )
        .join(", "),
    );
  }
  const analysisResponse = await postSelectedFilesAnalysis(
    buildAnalysisFormData(
      normalizedSelectedFiles,
      getAnalysisParamsForSelectedFile,
      preprocessingParams,
    ),
  );
  return {
    successfulAnalysisResults: analysisResponse.results.filter(
      (analysisResult) => analysisResult.analysis,
    ),
    failedAnalysisResults: [
      ...normalizedSelectedFileResultsErrors,
      ...analysisResponse.results.filter((analysisResult) => analysisResult.error),
    ],
  };
}
export function buildAnalyzeToast({
  failedAnalysisResults,
  selectedFileNames,
  successfulAnalysisResults,
}) {
  const failedAnalysisResultsSummary = failedAnalysisResults.length
    ? ` Failed: ${failedAnalysisResults.map((analysisResult) => `${analysisResult.file_name} (${analysisResult.error})`).join(", ")}`
    : "";
  const selectedFileNamesPreview = `${selectedFileNames.slice(0, 3).join(", ")}${selectedFileNames.length > 3 ? "..." : ""}`;
  return {
    toastMessage: `Analyzed ${successfulAnalysisResults.length}/${selectedFileNames.length} selected file(s): ${selectedFileNamesPreview}.${failedAnalysisResultsSummary}`,
    toastVariant: successfulAnalysisResults.length ? "success" : "error",
  };
}
export function buildAnalysisNavState({
  successfulAnalysisResults,
  getColorForFile,
  analysisParams,
  csvFilterParams,
  preprocessingParams,
}) {
  return {
    analysisResults: successfulAnalysisResults,
    initialColorMap: Object.fromEntries(
      successfulAnalysisResults.map((analysisResult) => [
        analysisResult.file_name,
        getColorForFile(analysisResult.file_name),
      ]),
    ),
    analysisParams,
    csvFilterParams,
    preprocessingParams,
  };
}

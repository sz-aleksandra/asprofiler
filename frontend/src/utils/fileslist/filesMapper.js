export function fromAnalysisRequest(files, parameters, parametersByFile, preprocessingParameters) {
  const body = new FormData();
  files.forEach((file) => body.append("files", file));
  body.append(
    "parameters_json",
    JSON.stringify({
      default: parameters,
      per_file: Object.fromEntries(
        Object.entries(parametersByFile || {}).filter(
          ([, value]) => value && Object.keys(value).length,
        ),
      ),
      preprocessing_parameters: preprocessingParameters,
    }),
  );
  return body;
}

export function toAnalysisResponse(analysisResponse, failedPreprocessing = []) {
  const results = Array.isArray(analysisResponse?.results) ? analysisResponse.results : [];
  return {
    successfulResults: results.filter((item) => item?.profile),
    failedResults: [
      ...failedPreprocessing.map((item) => ({ name: item.name, error: item.error })),
      ...results.filter((item) => item?.error),
    ],
  };
}

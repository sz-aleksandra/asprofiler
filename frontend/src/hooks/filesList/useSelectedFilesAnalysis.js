import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  analyzeSelectedFiles,
  buildAnalysisNavState,
  buildAnalyzeToast,
} from "../../utils/filesList/selectedFileAnalysis";

export default function useSelectedFilesAnalysis({
  files,
  analysisParamsState,
  getColorForFile,
  setToastState,
}) {
  const navigate = useNavigate();
  const [isAnalyzingSelectedFiles, setIsAnalyzingSelectedFiles] = useState(false);
  const runSelectedFilesAnalysis = async (selectedFileNames) => {
    setIsAnalyzingSelectedFiles(true);
    try {
      const { successfulAnalysisResults, failedAnalysisResults } = await analyzeSelectedFiles({
        selectedFiles: files.filter((file) => selectedFileNames.includes(file.name)),
        csvFilterParams: analysisParamsState.csvFilterParams,
        analysisParams: analysisParamsState.analysisParams,
        getAnalysisParamsForSelectedFile: analysisParamsState.getAnalysisParamsForSelectedFile,
        preprocessingParams: analysisParamsState.preprocessingParams,
      });

      if (successfulAnalysisResults.length) {
        navigate("/analysis", {
          state: buildAnalysisNavState({
            successfulAnalysisResults,
            getColorForFile,
            analysisParams: analysisParamsState.analysisParams,
            csvFilterParams: analysisParamsState.csvFilterParams,
            preprocessingParams: analysisParamsState.preprocessingParams,
          }),
        });
      }

      setToastState(
        buildAnalyzeToast({
          successfulAnalysisResults,
          failedAnalysisResults,
          selectedFileNames,
        }),
      );
    } catch (analysisError) {
      setToastState({
        toastMessage: analysisError.message,
        toastVariant: "error",
      });
    } finally {
      setIsAnalyzingSelectedFiles(false);
    }
  };

  return { isAnalyzingSelectedFiles, runSelectedFilesAnalysis };
}

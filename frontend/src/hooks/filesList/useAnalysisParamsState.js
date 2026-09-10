import {
  DEFAULT_ANALYSIS_PARAMS,
  DEFAULT_CSV_FILTER,
  DEFAULT_PREPROCESSING,
} from "../../utils/shared/constants";
import useLocalStorage from "../shared/useLocalStorage";

export default function useAnalysisParamsState() {
  const [analysisParams, setAnalysisParams] = useLocalStorage(
    "analysis_params",
    DEFAULT_ANALYSIS_PARAMS,
  );
  const [csvFilterParams, setCsvFilterParams] = useLocalStorage(
    "analysis_csv_filter",
    DEFAULT_CSV_FILTER,
  );
  const [preprocessingParams, setPreprocessingParams] = useLocalStorage(
    "analysis_preprocessing",
    DEFAULT_PREPROCESSING,
  );
  const [storedParamsBySelectedFileName, setStoredParamsBySelectedFileName] = useLocalStorage(
    "analysis_params_map",
    {},
  );

  return {
    analysisParams,
    csvFilterParams,
    preprocessingParams,
    getAnalysisParamsForSelectedFile: (selectedFileName) => ({
      ...analysisParams,
      ...storedParamsBySelectedFileName[selectedFileName],
    }),
    updateAnalysisParam: (analysisParamKey, analysisParamValue) =>
      setAnalysisParams((previousAnalysisParams) => ({
        ...previousAnalysisParams,
        [analysisParamKey]: analysisParamValue,
      })),
    updateCsvFilterParam: (csvFilterParamKey, csvFilterParamValue) =>
      setCsvFilterParams((previousCsvFilterParams) => ({
        ...previousCsvFilterParams,
        [csvFilterParamKey]: csvFilterParamValue,
      })),
    updatePreprocessingParam: (preprocessingParamKey, preprocessingParamValue) =>
      setPreprocessingParams((previousPreprocessingParams) => ({
        ...previousPreprocessingParams,
        [preprocessingParamKey]: preprocessingParamValue,
      })),
    updateParamsForSelectedFile: (selectedFileNameToUpdate, analysisParamKey, analysisParamValue) =>
      setStoredParamsBySelectedFileName((previousParamsBySelectedFileName) => ({
        ...previousParamsBySelectedFileName,
        [selectedFileNameToUpdate]: {
          ...previousParamsBySelectedFileName[selectedFileNameToUpdate],
          [analysisParamKey]: analysisParamValue,
        },
      })),
  };
}

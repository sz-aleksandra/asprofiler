import { useCallback, useState } from "react";

import FilesSelectionTable from "../../components/filesList/FilesSelectionTable/FilesSelectionTable";
import PerSelectedFileAnalysisParamsForm from "../../components/filesList/PerSelectedFileAnalysisParamsForm/PerSelectedFileAnalysisParamsForm";
import AnalysisParamsForm from "../../components/shared/AnalysisParamsForm/AnalysisParamsForm";
import useAnalysisParamsState from "../../hooks/filesList/useAnalysisParamsState";
import useFilesSelection from "../../hooks/filesList/useFilesSelection";
import useSelectedFilesAnalysis from "../../hooks/filesList/useSelectedFilesAnalysis";
import useLocalStorage from "../../hooks/shared/useLocalStorage";
import Dropzone from "../../ui/Dropzone/Dropzone";
import Toast from "../../ui/Toast/Toast";
import { cssVar } from "../../utils/shared/conversions";

import styles from "./FilesList.module.css";
export default function FilesList() {
  const filesSelection = useFilesSelection();
  const analysisParamsState = useAnalysisParamsState();
  const [defaultColor, setDefaultColor] = useLocalStorage("analysis_default_color", () =>
    cssVar("--red"),
  );
  const [colorMap, setColorMap] = useLocalStorage("analysis_color_map", {});
  const getColorForFile = (fileName) => colorMap[fileName] ?? defaultColor;
  const [profilingSpeedUnit, setProfilingSpeedUnit] = useLocalStorage(
    "analysis_profiling_speed_unit",
    "m/s",
  );
  const [eventSpeedUnit, setEventSpeedUnit] = useLocalStorage("analysis_event_speed_unit", "km/h");
  const speedUnitsState = {
    profilingSpeedUnit,
    eventSpeedUnit,
    setProfilingSpeedUnit,
    setEventSpeedUnit,
  };
  const [toastState, setToastState] = useState({
    toastMessage: "",
  });
  const closeToast = useCallback(
    () =>
      setToastState({
        toastMessage: "",
      }),
    [],
  );
  const { isAnalyzingSelectedFiles, runSelectedFilesAnalysis } = useSelectedFilesAnalysis({
    files: filesSelection.files,
    analysisParamsState,
    getColorForFile,
    setToastState,
  });
  return (
    <div className={styles.filesListPage}>
      <h1 className={styles.title}>Files</h1>

      <Dropzone onFilesPicked={filesSelection.pickFiles} />

      <AnalysisParamsForm
        analysisParams={analysisParamsState.analysisParams}
        csvFilterParams={analysisParamsState.csvFilterParams}
        defaultColor={defaultColor}
        isDisabled={isAnalyzingSelectedFiles}
        onAnalysisParamChange={analysisParamsState.updateAnalysisParam}
        onCsvFilterParamChange={analysisParamsState.updateCsvFilterParam}
        onDefaultColorChange={setDefaultColor}
        onPreprocessingParamChange={analysisParamsState.updatePreprocessingParam}
        preprocessingParams={analysisParamsState.preprocessingParams}
        speedUnitsState={speedUnitsState}
      />

      <FilesSelectionTable
        filesSelection={filesSelection}
        isAnalyzingSelectedFiles={isAnalyzingSelectedFiles}
        renderSelectedFileParamsForm={(selectedFile) => (
          <PerSelectedFileAnalysisParamsForm
            isDisabled={isAnalyzingSelectedFiles}
            onSelectedFileColorChange={(selectedFileColor) =>
              setColorMap((previousColorMap) => ({
                ...previousColorMap,
                [selectedFile.name]: selectedFileColor,
              }))
            }
            onSelectedFileParamChange={(selectedFileParamKey, selectedFileParamValue) =>
              analysisParamsState.updateParamsForSelectedFile(
                selectedFile.name,
                selectedFileParamKey,
                selectedFileParamValue,
              )
            }
            perSelectedFileParams={analysisParamsState.getAnalysisParamsForSelectedFile(
              selectedFile.name,
            )}
            selectedFileColor={getColorForFile(selectedFile.name)}
            speedUnitsState={speedUnitsState}
          />
        )}
        runSelectedFilesAnalysis={runSelectedFilesAnalysis}
      />

      <Toast {...toastState} onCloseToast={closeToast} />
    </div>
  );
}

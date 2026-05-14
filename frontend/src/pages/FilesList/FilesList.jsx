import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import AnalysisParametersForm from "../../components/shared/AnalysisParametersForm/AnalysisParametersForm";
import Dropzone from "../../components/fileslist/Dropzone/Dropzone";
import FilesSelectionTable from "../../components/fileslist/FilesSelectionTable/FilesSelectionTable";
import Toast from "../../ui/Toast/Toast";

import { analyzeFiles } from "../../api/filesApi";
import useLocalStorage from "../../hooks/shared/useLocalStorage";
import { fromAnalysisRequest, toAnalysisResponse } from "../../utils/fileslist/filesMapper";
import { getCssVar } from "../../utils/shared/getCssVar";
import { normalizeGpsCsvFile } from "../../utils/fileslist/normalizeGpsCsv";
import {
  DEFAULT_ANALYSIS_PARAMS,
  DEFAULT_PREPROCESSING,
} from "../../utils/shared/analysisConstants";
import { buildAnalysisColorMap } from "../../utils/shared/analysisRows";

import styles from "./FilesList.module.css";

export default function FilesList() {
  const navigate = useNavigate();
  const [pendingFiles, setPendingFiles] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });

  const [storedParameters, setStoredParameters] = useLocalStorage(
    "analysis_params",
    DEFAULT_ANALYSIS_PARAMS,
  );
  const parameters = useMemo(
    () => ({ ...DEFAULT_ANALYSIS_PARAMS, ...storedParameters }),
    [storedParameters],
  );
  const [defaultColor, setDefaultColor] = useLocalStorage(
    "analysis_default_color",
    getCssVar("--red"),
  );
  const [colorsMap, setColorsMap] = useLocalStorage("analysis_colors_map", {});
  const [storedParametersByFile, setStoredParametersByFile] = useLocalStorage(
    "analysis_params_map",
    {},
  );
  const parametersByFile = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(storedParametersByFile).map(([fileName, fileParameters]) => [
          fileName,
          { ...DEFAULT_ANALYSIS_PARAMS, ...fileParameters },
        ]),
      ),
    [storedParametersByFile],
  );
  const [storedPreprocessing, setPreprocessingParameters] = useLocalStorage(
    "analysis_preprocessing",
    DEFAULT_PREPROCESSING,
  );
  const preprocessingParameters = useMemo(
    () => ({ ...DEFAULT_PREPROCESSING, ...storedPreprocessing }),
    [storedPreprocessing],
  );
  const [profilingSpeedUnit, setProfilingSpeedUnit] = useLocalStorage(
    "analysis_profiling_speed_unit",
    "m/s",
  );
  const [eventSpeedUnit, setEventSpeedUnit] = useLocalStorage("analysis_event_speed_unit", "km/h");

  const closeToast = () => setToast({ message: "", type: "info" });

  const onToggleOne = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const onToggleAll = (value) => {
    if (!value) return setSelected(new Set());
    return setSelected(new Set(pendingFiles.map((file) => file.name)));
  };

  const onFiles = (picked) => {
    setPendingFiles((prev) => {
      const byName = new Map(prev.map((file) => [file.name, file]));
      picked.forEach((file) => {
        byName.set(file.name, file);
      });
      return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  const onRemoveOne = (name) => {
    setPendingFiles((prev) => prev.filter((file) => file.name !== name));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  };

  const onRemoveSelected = () => {
    if (!selected.size) return;
    setPendingFiles((prev) => prev.filter((file) => !selected.has(file.name)));
    setSelected(new Set());
  };

  const updateGlobalParam = (key, value) => {
    setStoredParameters((prev) => ({ ...prev, [key]: value }));
    setStoredParametersByFile((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([name, fileParameters]) => [
          name,
          { ...fileParameters, [key]: value },
        ]),
      ),
    );
  };

  const updatePreprocessingParameter = (key, value) => {
    setPreprocessingParameters((prev) => ({ ...prev, [key]: value }));
  };

  const analyze = async (names) => {
    if (!names.length) return;
    const filesToAnalyze = pendingFiles.filter((file) => names.includes(file.name));
    if (!filesToAnalyze.length) return;

    setBusy(true);
    try {
      const processed = await Promise.all(
        filesToAnalyze.map(async (file) => {
          try {
            const normalized = await normalizeGpsCsvFile(file, {
              maximumHorizontalAccuracyMeters:
                preprocessingParameters.maximum_horizontal_accuracy_meters,
              maximumHorizontalDilutionOfPrecision:
                preprocessingParameters.maximum_horizontal_dilution_of_precision,
              minimumSatellites: preprocessingParameters.minimum_satellites,
            });
            return { name: file.name, file: normalized };
          } catch (error) {
            return { name: file.name, error: String(error.message || error) };
          }
        }),
      );
      const readyFiles = processed.filter((item) => item.file).map((item) => item.file);
      const failedPreprocessing = processed.filter((item) => item.error);

      if (!readyFiles.length) {
        throw new Error(
          failedPreprocessing.map((item) => `${item.name} (${item.error})`).join(", ") ||
            "No files could be preprocessed",
        );
      }

      const requestBody = fromAnalysisRequest(
        readyFiles,
        parameters,
        parametersByFile,
        preprocessingParameters,
      );
      const analysisResponse = await analyzeFiles(requestBody);
      const { successfulResults, failedResults } = toAnalysisResponse(
        analysisResponse,
        failedPreprocessing,
      );

      if (successfulResults.length) {
        navigate("/analysis", {
          state: {
            results: successfulResults,
            color_map: buildAnalysisColorMap(successfulResults, colorsMap, defaultColor),
            analysis_parameters: parameters,
            per_file_parameters: parametersByFile,
            preprocessing_parameters: preprocessingParameters,
          },
        });
      }

      const failedMessage = failedResults.length
        ? ` Failed: ${failedResults.map((item) => `${item.name} (${item.error})`).join(", ")}`
        : "";
      setToast({
        message: `Analyzed ${successfulResults.length}/${names.length} file(s): ${names
          .slice(0, 3)
          .join(", ")}${names.length > 3 ? "..." : ""}.${failedMessage}`,
        type: successfulResults.length ? "success" : "error",
      });
    } catch (error) {
      setToast({ message: String(error.message || error), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const allSelected =
    pendingFiles.length > 0 && pendingFiles.every((file) => selected.has(file.name));

  const sortedFiles = useMemo(
    () => [...pendingFiles].sort((a, b) => a.name.localeCompare(b.name)),
    [pendingFiles],
  );
  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Files</h1>

      <Dropzone onFiles={onFiles} />

      <AnalysisParametersForm
        analysisParameters={parameters}
        preprocessingParameters={preprocessingParameters}
        profilingSpeedUnit={profilingSpeedUnit}
        onProfilingSpeedUnitChange={setProfilingSpeedUnit}
        eventSpeedUnit={eventSpeedUnit}
        onEventSpeedUnitChange={setEventSpeedUnit}
        onAnalysisParameterChange={updateGlobalParam}
        onPreprocessingParameterChange={updatePreprocessingParameter}
        defaultColor={defaultColor}
        onDefaultColorChange={setDefaultColor}
        showDefaultColor
        disabled={busy}
      />

      <FilesSelectionTable
        pendingFiles={pendingFiles}
        selected={selected}
        busy={busy}
        allSelected={allSelected}
        sortedFiles={sortedFiles}
        analyze={analyze}
        onToggleAll={onToggleAll}
        onToggleOne={onToggleOne}
        onRemoveOne={onRemoveOne}
        onRemoveSelected={onRemoveSelected}
        parameters={parameters}
        parametersByFile={parametersByFile}
        defaultColor={defaultColor}
        colorsMap={colorsMap}
        setColorsMap={setColorsMap}
        profilingSpeedUnit={profilingSpeedUnit}
        onProfilingSpeedUnitChange={setProfilingSpeedUnit}
        setParametersByFile={setStoredParametersByFile}
      />

      <Toast message={toast.message} type={toast.type} onClose={closeToast} />
    </section>
  );
}

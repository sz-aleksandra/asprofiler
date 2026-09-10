import { useCallback, useEffect } from "react";

import AnalysisSidebar from "../../components/analysis/AnalysisSidebar/AnalysisSidebar";
import AnalysisParamsForm from "../../components/shared/AnalysisParamsForm/AnalysisParamsForm";
import useAnalysisResultColorsAndVisibility from "../../hooks/analysis/useAnalysisResultColorsAndVisibility";
import useAnalysisViewOptions from "../../hooks/analysis/useAnalysisViewOptions";
import useChosenAnalysisPointsSelection from "../../hooks/analysis/useChosenAnalysisPointsSelection";
import { useAnalysisSidebarOpen } from "../../hooks/shared/useAnalysisSidebarOpen";
import Button from "../../ui/Button/Button";
import { buildAnalysisViewModel } from "../../utils/analysis/analysisState";
import { getAnalysisProfileConfig } from "../../utils/analysis/constants";
import { exportAnalysis } from "../../utils/analysis/export/analysisBundleExport";
import { secondsToTime } from "../../utils/analysis/formatters";
import { buildAnalysisTableConfig } from "../../utils/analysis/tables/config";

import styles from "./Analysis.module.css";
import AccDecDirectionAnalysisProfileSection from "./sections/AccDecDirectionAnalysisProfileSection";
import DistributionsAndEventsSection from "./sections/DistributionsAndEventsSection";
import FilteredSampleStatsSection from "./sections/FilteredSampleStatsSection";
import TimeSeriesAndTrajectorySection from "./sections/TimeSeriesAndTrajectorySection";
export default function Analysis({ analysisState }) {
  const { analysisResults, initialColorMap, analysisParams, csvFilterParams, preprocessingParams } =
    analysisState;
  const { setIsAnalysisSidebarOpen, isAnalysisSidebarOpen } = useAnalysisSidebarOpen();
  const closeAnalysisSidebar = useCallback(
    () => setIsAnalysisSidebarOpen(false),
    [setIsAnalysisSidebarOpen],
  );
  useEffect(() => {
    return closeAnalysisSidebar;
  }, [closeAnalysisSidebar]);
  const analysisResultColorsAndVisibility = useAnalysisResultColorsAndVisibility(
    analysisResults,
    initialColorMap,
  );
  const analysisViewOptions = useAnalysisViewOptions();
  const analysisViewModel = buildAnalysisViewModel(
    analysisResults,
    analysisResultColorsAndVisibility.isAccDecDirectionHidden,
    analysisResultColorsAndVisibility.colorMap,
    analysisViewOptions,
  );
  const chosenAnalysisPointsTableState = useChosenAnalysisPointsSelection(
    analysisViewModel.visibleAnalysisResults,
  );
  const formatAnalysisTimeLabel = (relativeTimeSeconds, absoluteTimeSeconds) =>
    secondsToTime(
      analysisViewOptions.timeMode === "relative" ? relativeTimeSeconds : absoluteTimeSeconds,
    );
  const analysisProfileConfig = getAnalysisProfileConfig(analysisViewOptions.analysisProfileMode);
  const analysisTableConfig = buildAnalysisTableConfig({
    analysisProfileConfig,
    analysisResults,
    formatEventBinLabel: analysisViewModel.formatEventBinLabel,
    filteredSampleStatsTableRows: analysisViewModel.filteredSampleStatsTableRows,
  });
  return (
    <div className={styles.analysisPage}>
      <h1 className={styles.title}>Analysis</h1>

      <AnalysisSidebar
        chosenAnalysisPointsTableState={chosenAnalysisPointsTableState}
        formatChosenAnalysisPointTimeLabel={(chosenAnalysisPoint) =>
          formatAnalysisTimeLabel(
            chosenAnalysisPoint.relativeTime,
            chosenAnalysisPoint.absoluteTime,
          )
        }
        isOpen={isAnalysisSidebarOpen}
        onCloseAnalysisSidebar={closeAnalysisSidebar}
      />

      <AnalysisParamsForm
        analysisParams={analysisParams}
        csvFilterParams={csvFilterParams}
        isDisabled={true}
        preprocessingParams={preprocessingParams}
        speedUnitsState={analysisViewOptions.speedUnitsState}
      />

      <div className={styles.exportToolbar}>
        <Button
          type="button"
          buttonVariant="primary"
          onClick={() =>
            exportAnalysis({
              analysisResults,
              analysisParams,
              csvFilterParams,
              preprocessingParams,
            })
          }
        >
          Export All
        </Button>
      </div>

      <AccDecDirectionAnalysisProfileSection
        analysisProfileConfig={analysisProfileConfig}
        analysisResultColorsAndVisibility={analysisResultColorsAndVisibility}
        analysisResults={analysisResults}
        analysisViewModel={analysisViewModel}
        analysisViewOptions={analysisViewOptions}
        chosenAnalysisPointsTableState={chosenAnalysisPointsTableState}
      />

      {analysisViewModel.visibleAnalysisResults.length === 0 ? (
        <div className={styles.allHiddenMessage}>All series hidden. Use &quot;Show&quot;.</div>
      ) : (
        <div className={styles.sectionsStack}>
          <FilteredSampleStatsSection
            analysisResults={analysisResults}
            analysisTableConfig={analysisTableConfig}
            analysisViewOptions={analysisViewOptions}
            colorMap={analysisResultColorsAndVisibility.colorMap}
          />

          <TimeSeriesAndTrajectorySection
            analysisProfileConfig={analysisProfileConfig}
            analysisViewModel={analysisViewModel}
            analysisViewOptions={analysisViewOptions}
            chosenAnalysisPointsTableState={chosenAnalysisPointsTableState}
            colorMap={analysisResultColorsAndVisibility.colorMap}
            formatAnalysisTimeLabel={formatAnalysisTimeLabel}
          />

          <DistributionsAndEventsSection
            analysisResults={analysisResults}
            analysisTableConfig={analysisTableConfig}
            analysisViewModel={analysisViewModel}
            analysisViewOptions={analysisViewOptions}
            colorMap={analysisResultColorsAndVisibility.colorMap}
          />
        </div>
      )}
    </div>
  );
}

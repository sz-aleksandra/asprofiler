import { buildAccDecDirectionAnalysisProfiles } from "./charts/accDecDirectionAnalysisProfileChart";
import {
  buildEventDistributionCharts,
  buildSpeedDistributionChart,
} from "./charts/distributionChart";
import { buildCombinedTimeSeries, buildSpeedReferenceLines } from "./charts/timeSeriesChart";
import { getAnalysisProfileConfig } from "./constants";
import { formatEventBinLabel } from "./tables/config";
import { buildFilteredSampleStatsTableRows, buildEventRows } from "./tables/rows";

export function buildAnalysisViewModel(
  analysisResults,
  isAccDecDirectionHidden,
  colorMap,
  analysisViewOptions,
) {
  const analysisProfileConfig = getAnalysisProfileConfig(analysisViewOptions.analysisProfileMode);
  const speedMultiplier = analysisViewOptions.timeSeriesSpeedUnit === "km/h" ? 3.6 : 1;

  const visibleAnalysisResults = analysisResults.filter(
    (analysisResult) =>
      !isAccDecDirectionHidden(analysisResult.file_name, "acc") ||
      !isAccDecDirectionHidden(analysisResult.file_name, "dec"),
  );

  const areAllAccDecDirectionAnalysisProfilesShown =
    analysisResults.length > 0 &&
    analysisResults.every(
      (analysisResult) =>
        !isAccDecDirectionHidden(analysisResult.file_name, "acc") &&
        !isAccDecDirectionHidden(analysisResult.file_name, "dec"),
    );

  const visibleAccDecDirectionAnalysisProfilesCount = analysisResults.reduce(
    (visibleAccDecDirectionAnalysisProfilesCount, analysisResult) =>
      visibleAccDecDirectionAnalysisProfilesCount +
      (isAccDecDirectionHidden(analysisResult.file_name, "acc") ? 0 : 1) +
      (isAccDecDirectionHidden(analysisResult.file_name, "dec") ? 0 : 1),
    0,
  );

  const combinedTimeSeries = buildCombinedTimeSeries({
    visibleAnalysisResults,
    colorMap,
    timeMode: analysisViewOptions.timeMode,
    speedMultiplier,
    analysisProfileConfig,
  });

  const speedReferenceLines = buildSpeedReferenceLines({
    visibleAnalysisResults,
    colorMap,
    isAccDecDirectionHidden,
    speedMultiplier,
  });

  const filteredSampleStatsTableRows = buildFilteredSampleStatsTableRows({
    visibleAnalysisResults,
    isAccDecDirectionHidden,
    statsActivityScopeMode: analysisViewOptions.statsActivityScopeMode,
    pitchZoneMode: analysisViewOptions.pitchZoneMode,
    analysisProfileConfig,
  });

  const eventRows = buildEventRows({
    visibleAnalysisResults,
    isAccDecDirectionHidden,
    eventActivityScopeMode: analysisViewOptions.eventActivityScopeMode,
    pitchZoneMode: analysisViewOptions.pitchZoneMode,
    binMode: analysisViewOptions.binMode,
    binMetric: analysisViewOptions.binMetric,
  });

  const speedDistributionChart = buildSpeedDistributionChart({
    visibleAnalysisResults,
    colorMap,
    eventActivityScopeMode: analysisViewOptions.eventActivityScopeMode,
    pitchZoneMode: analysisViewOptions.pitchZoneMode,
    distributionYAxisScale: analysisViewOptions.distributionYAxisScale,
  });

  const eventDistributionCharts = buildEventDistributionCharts({
    visibleAnalysisResults,
    isAccDecDirectionHidden,
    eventActivityScopeMode: analysisViewOptions.eventActivityScopeMode,
    pitchZoneMode: analysisViewOptions.pitchZoneMode,
    binMode: analysisViewOptions.binMode,
    binMetric: analysisViewOptions.binMetric,
    distributionYAxisScale: analysisViewOptions.distributionYAxisScale,
    colorMap,
  });

  return {
    visibleAnalysisResults,
    areAllAccDecDirectionAnalysisProfilesShown,
    visibleAccDecDirectionAnalysisProfilesCount,
    canUseAbsoluteTimeAxis:
      analysisViewOptions.timeMode === "absolute" && visibleAnalysisResults.length > 0,
    accDecDirectionAnalysisProfiles: buildAccDecDirectionAnalysisProfiles(
      visibleAnalysisResults,
      isAccDecDirectionHidden,
    ),
    combinedTimeSeries,
    speedReferenceLines,
    filteredSampleStatsTableRows,
    eventRows,
    speedDistributionChart,
    eventDistributionCharts,
    formatEventBinLabel: (binLabel) =>
      formatEventBinLabel(binLabel, analysisViewOptions.binMode, analysisViewOptions.binMetric),
  };
}

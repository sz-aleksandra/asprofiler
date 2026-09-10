import {
  ACC_DEC_DIRECTION_CONFIGS,
  ACC_DEC_DIRECTIONS,
  BIN_METRIC_OPTIONS,
  BIN_MODE_OPTIONS,
  EVENT_BIN_DEFS,
  PITCH_ZONE_OPTIONS,
  ACTIVITY_SCOPE_OPTIONS,
} from "../../analysis/constants";
import { safeScaleByMass } from "../formatters";
const METRIC_LABELS = {
  speed: "Speed",
  acc: "Acceleration",
  dec: "Deceleration",
  accForce: "Acceleration Force",
  decForce: "Deceleration Force",
};
const METRIC_ORDER = ["speed", "acc", "dec"];
const SCALED_METRIC_STAT_FIELDS = ["min", "mean", "median", "max", "area"];
function scaleStatsByMass(statValues, bodyMass) {
  return {
    ...statValues,
    ...Object.fromEntries(
      SCALED_METRIC_STAT_FIELDS.map((scaledMetricStatFieldKey) => [
        scaledMetricStatFieldKey,
        safeScaleByMass(statValues[scaledMetricStatFieldKey], bodyMass),
      ]),
    ),
  };
}
export function buildAccDecDirectionAnalysisProfileTableRows({
  analysisResults,
  colorMap,
  isAccDecDirectionHidden,
}) {
  return ACC_DEC_DIRECTION_CONFIGS.flatMap(
    ({ accDecDirection, accDecDirectionLabel, accDecDirectionMultiplier }) =>
      analysisResults.map((analysisResult) => ({
        key: `${analysisResult.file_name}-${accDecDirection}`,
        fileName: analysisResult.file_name,
        accDecDirection,
        accDecDirectionLabel,
        accDecDirectionAnalysisProfileFit:
          analysisResult.analysis[`${accDecDirection}_profile_fit`],
        accDecDirectionMultiplier,
        color: colorMap[analysisResult.file_name],
        isHidden: isAccDecDirectionHidden(analysisResult.file_name, accDecDirection),
        bodyMass: analysisResult.analysis.meta.body_mass_kg,
      })),
  );
}
export function buildEventRowsForAccDecDirection({
  visibleAnalysisResults,
  isAccDecDirectionHidden,
  accDecDirection,
  binMode,
  binMetric,
  pitchZoneMode,
  eventActivityScopeMode,
}) {
  const visibleAnalysisResultsForAccDecDirection = visibleAnalysisResults.filter(
    (analysisResult) => !isAccDecDirectionHidden(analysisResult.file_name, accDecDirection),
  );
  return ["All", ...EVENT_BIN_DEFS[binMode][binMetric].map((binDef) => binDef.binLabel)].flatMap(
    (binLabel, binLabelIndex) => {
      const isAllEventsRow = binLabel === "All";
      const eventBinIndex = binLabelIndex - 1;
      const eventRowsForBin = visibleAnalysisResultsForAccDecDirection.map(
        (visibleAnalysisResultForAccDecDirection) => {
          const activityScopeEvents =
            visibleAnalysisResultForAccDecDirection.analysis[`${accDecDirection}_events`][
              pitchZoneMode
            ][eventActivityScopeMode];
          return {
            fileName: visibleAnalysisResultForAccDecDirection.file_name,
            binLabel,
            stats: isAllEventsRow
              ? activityScopeEvents.stats
              : activityScopeEvents.bins[binMode][binMetric][eventBinIndex],
          };
        },
      );
      if (!isAllEventsRow && eventRowsForBin.every((eventRow) => eventRow.stats.count === 0)) {
        return [];
      }
      return eventRowsForBin;
    },
  );
}
export function buildEventRows({
  visibleAnalysisResults,
  isAccDecDirectionHidden,
  eventActivityScopeMode,
  pitchZoneMode,
  binMode,
  binMetric,
}) {
  return Object.fromEntries(
    ACC_DEC_DIRECTIONS.map((accDecDirection) => [
      accDecDirection,
      buildEventRowsForAccDecDirection({
        accDecDirection,
        visibleAnalysisResults,
        isAccDecDirectionHidden,
        eventActivityScopeMode,
        pitchZoneMode,
        binMode,
        binMetric,
      }),
    ]),
  );
}
export function* iterateEventRowsForAccDecDirection(analysisResults, accDecDirection) {
  const bodyMassByFile = Object.fromEntries(
    analysisResults.map((analysisResult) => [
      analysisResult.file_name,
      analysisResult.analysis.meta.body_mass_kg,
    ]),
  );
  for (const { value: eventActivityScopeMode } of ACTIVITY_SCOPE_OPTIONS) {
    for (const { value: pitchZoneMode } of PITCH_ZONE_OPTIONS) {
      for (const { value: binMode } of BIN_MODE_OPTIONS) {
        for (const { value: binMetric } of BIN_METRIC_OPTIONS) {
          const eventRowsForAccDecDirection = buildEventRowsForAccDecDirection({
            accDecDirection,
            visibleAnalysisResults: analysisResults,
            isAccDecDirectionHidden: () => false,
            eventActivityScopeMode,
            pitchZoneMode,
            binMode,
            binMetric,
          });
          for (const row of eventRowsForAccDecDirection) {
            yield {
              row,
              eventActivityScopeMode,
              pitchZoneMode,
              binMode,
              binMetric,
              bodyMass: bodyMassByFile[row.fileName],
            };
          }
        }
      }
    }
  }
}
export function buildFilteredSampleStatsTableRows({
  visibleAnalysisResults,
  pitchZoneMode,
  statsActivityScopeMode,
  analysisProfileConfig,
  isAccDecDirectionHidden,
}) {
  const statsForVisibleAnalysisResults = visibleAnalysisResults.map((analysisResult) => ({
    analysisResult,
    bodyMass: analysisResult.analysis.meta.body_mass_kg,
    activityScopeStats: analysisResult.analysis.sample_stats[pitchZoneMode][statsActivityScopeMode],
  }));
  return METRIC_ORDER.flatMap((metricKey) => {
    const tableMetricKey =
      analysisProfileConfig.isForce && metricKey !== "speed" ? `${metricKey}Force` : metricKey;
    return statsForVisibleAnalysisResults
      .filter(
        ({ analysisResult }) =>
          metricKey === "speed" || !isAccDecDirectionHidden(analysisResult.file_name, metricKey),
      )
      .map(({ activityScopeStats, analysisResult, bodyMass }) => {
        const metricStats = activityScopeStats[metricKey];
        return {
          fileName: analysisResult.file_name,
          metricLabel: METRIC_LABELS[tableMetricKey],
          stats:
            analysisProfileConfig.isForce && metricKey !== "speed"
              ? scaleStatsByMass(metricStats, bodyMass)
              : metricStats,
          duration: activityScopeStats.duration,
          tableMetricKey,
        };
      });
  });
}

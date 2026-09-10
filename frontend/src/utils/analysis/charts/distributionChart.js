import { ACC_DEC_DIRECTIONS, BIN_BASELINE_MASS, EVENT_BIN_DEFS } from "../../analysis/constants";
import { cssVar } from "../../shared/conversions";

import { buildHorizontalLegend } from "./shared";
function buildDistributionChartTitleSuffix(eventActivityScopeMode, pitchZoneMode) {
  return (
    (eventActivityScopeMode === "high_speed_running" ? " (High-speed running only)" : "") +
    (pitchZoneMode !== "full" ? ` - ${pitchZoneMode}` : "")
  );
}
export function buildDistributionChartTraces(distributionChartTraces) {
  return distributionChartTraces.map((distributionChartTrace) => ({
    ...distributionChartTrace,
    opacity: 0.3,
    marker: {
      ...distributionChartTrace.marker,
      line: {
        width: 2,
        color: distributionChartTrace.marker.color,
      },
    },
  }));
}
export function buildDistributionChartLayout({
  distributionChartTitle,
  distributionChartXAxis,
  distributionChartYAxis,
}) {
  const blackFont = {
    color: cssVar("--black"),
  };
  return {
    title: {
      text: distributionChartTitle,
      font: blackFont,
    },
    font: blackFont,
    uirevision: distributionChartTitle,
    margin: {
      l: 50,
      r: 20,
      t: 40,
      b: 80,
    },
    showlegend: true,
    barmode: "overlay",
    bargap: 0,
    bargroupgap: 0,
    xaxis: distributionChartXAxis,
    yaxis: distributionChartYAxis,
    legend: buildHorizontalLegend(-0.22),
  };
}
export function buildSpeedDistributionChart({
  visibleAnalysisResults,
  pitchZoneMode,
  eventActivityScopeMode,
  colorMap,
  distributionYAxisScale,
}) {
  const analysisResultsWithSpeedBins = visibleAnalysisResults
    .map((analysisResult) => ({
      analysisResult,
      speedBinCounts:
        analysisResult.analysis.sample_distributions[pitchZoneMode][eventActivityScopeMode],
    }))
    .filter(({ speedBinCounts }) => speedBinCounts.length);
  if (!analysisResultsWithSpeedBins.length) return null;
  const maxSpeedBinCount = Math.max(
    ...analysisResultsWithSpeedBins.map(({ speedBinCounts }) => speedBinCounts.length),
  );
  return {
    distributionChartKey: "speed",
    distributionChartTitle: `Speed Distribution${buildDistributionChartTitleSuffix(eventActivityScopeMode, pitchZoneMode)}`,
    distributionChartTraces: analysisResultsWithSpeedBins.map(
      ({ analysisResult, speedBinCounts }) => ({
        distributionTraceKey: `${analysisResult.file_name}-speed-distribution`,
        type: "bar",
        name: analysisResult.file_name,
        x: speedBinCounts.map((_, binIndex) => binIndex + 0.5),
        y: speedBinCounts,
        customdata: speedBinCounts.map((_, binIndex) => [binIndex, binIndex + 1]),
        width: 1,
        marker: {
          color: colorMap[analysisResult.file_name],
        },
        hovertemplate: `${analysisResult.file_name}<br>Speed: %{customdata[0]:.0f} to %{customdata[1]:.0f} m/s<br>Count: %{y}<extra></extra>`,
        showlegend: true,
      }),
    ),
    distributionChartXAxis: {
      title: {
        text: "m/s",
      },
      type: "linear",
      range: [0, maxSpeedBinCount],
      tick0: 0,
      dtick: 1,
    },
    distributionChartYAxis: {
      title: {
        text: "Count",
      },
      type: distributionYAxisScale,
      rangemode: "tozero",
    },
  };
}
function getOpenEventBinUpperBound(binDefs, metricPeakMagnitudes, standardBinWidth) {
  const openEventBinLowerBound = binDefs.at(-1).binLowerBound;
  const binMetricPeakMagnitudeDerivedUpperBound = metricPeakMagnitudes.length
    ? Math.ceil(Math.max(...metricPeakMagnitudes))
    : 0;
  return Math.max(
    binMetricPeakMagnitudeDerivedUpperBound,
    openEventBinLowerBound + standardBinWidth,
  );
}
function buildEventDistributionChartForAccDecDirection({
  binMetric,
  accDecDirection,
  visibleAnalysisResults,
  isAccDecDirectionHidden,
  pitchZoneMode,
  eventActivityScopeMode,
  binMode,
  colorMap,
  distributionYAxisScale,
}) {
  const isForceMetric = binMetric === "force";
  const metricUnit = isForceMetric ? "N" : "m/s²";
  const accDecDirectionLabel = accDecDirection === "acc" ? "Acceleration" : "Deceleration";
  const hoverMetricLabel = isForceMetric ? "Force" : accDecDirectionLabel;
  const accDecDirectionEventsKey = `${accDecDirection}_events`;
  const visibleAnalysisResultsForAccDecDirection = visibleAnalysisResults.filter(
    (analysisResult) => !isAccDecDirectionHidden(analysisResult.file_name, accDecDirection),
  );
  const getActivityScopeEventBins = (accDecDirectionEvents) =>
    accDecDirectionEvents[pitchZoneMode][eventActivityScopeMode].bins[binMode][binMetric];
  const binDefs = EVENT_BIN_DEFS[binMode][binMetric];
  const standardBinWidth = isForceMetric ? BIN_BASELINE_MASS : 1;
  const metricPeakMagnitudes = visibleAnalysisResultsForAccDecDirection.flatMap(
    (visibleAnalysisResultForAccDecDirection) => {
      const peakMagnitudeMultiplier = isForceMetric
        ? visibleAnalysisResultForAccDecDirection.analysis.meta.body_mass_kg
        : 1;
      return visibleAnalysisResultForAccDecDirection.analysis[accDecDirectionEventsKey][
        pitchZoneMode
      ][eventActivityScopeMode].events.map(
        (rawEvent) => rawEvent.peak_magnitude * peakMagnitudeMultiplier,
      );
    },
  );
  const openEventBinUpperBound = getOpenEventBinUpperBound(
    binDefs,
    metricPeakMagnitudes,
    standardBinWidth,
  );
  const eventBins = binDefs.map((binDef) => ({
    binLabel: binDef.binLabel,
    binLowerBound: binDef.binLowerBound,
    binUpperBound: binDef.binUpperBound ?? openEventBinUpperBound,
    isOpenEnded: binDef.binUpperBound == null,
  }));
  return {
    distributionChartKey: `${accDecDirection}-events-${binMode}`,
    distributionChartTitle: `${accDecDirectionLabel} Events by Bin${buildDistributionChartTitleSuffix(eventActivityScopeMode, pitchZoneMode)}`,
    distributionChartTraces: visibleAnalysisResultsForAccDecDirection.map(
      (visibleAnalysisResultForAccDecDirection) => {
        const activityScopeBins = getActivityScopeEventBins(
          visibleAnalysisResultForAccDecDirection.analysis[accDecDirectionEventsKey],
        );
        return {
          distributionTraceKey: `${visibleAnalysisResultForAccDecDirection.file_name}-${accDecDirection}-events`,
          type: "bar",
          name: visibleAnalysisResultForAccDecDirection.file_name,
          x: [...eventBins.keys()].map((binIndex) => binIndex + 0.5),
          y: [...eventBins.keys()].map((binIndex) => activityScopeBins[binIndex].count),
          width: 1,
          customdata: eventBins.map((eventBin) => {
            const lowerText = String(Number(eventBin.binLowerBound.toFixed(2)));
            return [
              eventBin.isOpenEnded
                ? `${hoverMetricLabel}: >=${lowerText} ${metricUnit}`
                : `${hoverMetricLabel}: ${lowerText} to ${String(Number(eventBin.binUpperBound.toFixed(2)))} ${metricUnit}`,
            ];
          }),
          marker: {
            color: colorMap[visibleAnalysisResultForAccDecDirection.file_name],
          },
          hovertemplate: `${visibleAnalysisResultForAccDecDirection.file_name}<br>%{customdata[0]}<br>Count: %{y}<extra></extra>`,
          showlegend: true,
        };
      },
    ),
    distributionChartXAxis: {
      title: {
        text: `${hoverMetricLabel} (${metricUnit})`,
      },
      type: "linear",
      range: [0, eventBins.length],
      tickmode: "array",
      tickvals: [...eventBins.keys(), eventBins.length],
      ticktext: [
        ...eventBins.map((eventBin) => String(Number(eventBin.binLowerBound.toFixed(2)))),
        String(Number(eventBins.at(-1).binUpperBound.toFixed(2))),
      ],
    },
    distributionChartYAxis: {
      title: {
        text: "Event count",
      },
      type: distributionYAxisScale,
      rangemode: "tozero",
    },
  };
}
export function buildEventDistributionCharts({
  visibleAnalysisResults,
  isAccDecDirectionHidden,
  eventActivityScopeMode,
  pitchZoneMode,
  binMode,
  binMetric,
  distributionYAxisScale,
  colorMap,
}) {
  return Object.fromEntries(
    ACC_DEC_DIRECTIONS.map((accDecDirection) => [
      accDecDirection,
      buildEventDistributionChartForAccDecDirection({
        accDecDirection,
        visibleAnalysisResults,
        isAccDecDirectionHidden,
        eventActivityScopeMode,
        pitchZoneMode,
        binMode,
        binMetric,
        distributionYAxisScale,
        colorMap,
      }),
    ]),
  );
}

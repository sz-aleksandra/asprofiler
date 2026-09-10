import { ACC_DEC_DIRECTIONS } from "../../analysis/constants";
import {
  runLengthEncodingToSampleLabels,
  relativeTimeSeriesToAbsoluteTimes,
  hexToRgba,
} from "../../analysis/formatters";
import { cssVar } from "../../shared/conversions";

import {
  buildHorizontalLegend,
  getPointsAroundChosenAnalysisPoint,
  groupPointsByFileName,
} from "./shared";
const ANALYSIS_PROFILE_MARKER_TRACE_CONFIG = [
  {
    accDecDirectionAnalysisProfilePointLabel: "excluded",
    traceNameSuffix: "rejected",
    markerSize: 4,
    markerOpacity: 0.2,
  },
  {
    accDecDirectionAnalysisProfilePointLabel: "included",
    traceNameSuffix: "included",
    markerSize: 4,
    markerOpacity: 0.4,
  },
  {
    accDecDirectionAnalysisProfilePointLabel: "selected",
    traceNameSuffix: "fit selected",
    markerSize: 7,
    markerOpacity: 0.9,
  },
];
function buildDashedLine() {
  return {
    color: cssVar("--black"),
    width: 1,
    dash: "dash",
  };
}
function buildAccDecDirectionAnalysisProfileMinSpeedLine(accDecDirectionAnalysisProfileMinSpeed) {
  return {
    type: "line",
    x0: accDecDirectionAnalysisProfileMinSpeed,
    x1: accDecDirectionAnalysisProfileMinSpeed,
    y0: 0,
    y1: 1,
    xref: "x",
    yref: "paper",
    line: buildDashedLine(),
  };
}
function buildAccDecDirectionAnalysisProfilesForAccDecDirection(
  visibleAnalysisResults,
  isAccDecDirectionHidden,
  accDecDirection,
) {
  return visibleAnalysisResults.flatMap((analysisResult) => {
    if (isAccDecDirectionHidden(analysisResult.file_name, accDecDirection)) return [];
    const accDecDirectionAnalysisProfileFit =
      analysisResult.analysis[`${accDecDirection}_profile_fit`];
    if (!accDecDirectionAnalysisProfileFit) return [];
    const sampleLabels = runLengthEncodingToSampleLabels(
      analysisResult.analysis.time_series[`${accDecDirection}_labels`],
    );
    const absoluteTimes = relativeTimeSeriesToAbsoluteTimes(analysisResult.analysis.time_series);
    const accDecDirectionAnalysisProfilePointsWithLabels =
      analysisResult.analysis.time_series.speeds.map((speed, timeSeriesIndex) => ({
        timeSeriesIndex,
        time: analysisResult.analysis.time_series.relative_times[timeSeriesIndex],
        absoluteTime: absoluteTimes[timeSeriesIndex],
        speed,
        acc: analysisResult.analysis.time_series.accs[timeSeriesIndex],
        label: sampleLabels[timeSeriesIndex],
      }));
    return [
      {
        fileName: analysisResult.file_name,
        accDecDirectionAnalysisProfileFit,
        meta: {
          bodyMass: analysisResult.analysis.meta.body_mass_kg,
          minSpeed: analysisResult.analysis.meta[`min_${accDecDirection}_speed_m_per_s`],
        },
        points: accDecDirectionAnalysisProfilePointsWithLabels,
        accDecDirection,
      },
    ];
  });
}
function buildAccDecDirectionAnalysisProfileTraceBuilders({
  fileName,
  buildAccDecDirectionAnalysisProfileHoverCustomData,
  analysisProfileColor,
  accDecDirectionAnalysisProfileHoverTemplate,
}) {
  const buildSpeedAccSeries = (accDecDirectionAnalysisProfilePoints) => ({
    x: accDecDirectionAnalysisProfilePoints.map(
      (accDecDirectionAnalysisProfilePoint) => accDecDirectionAnalysisProfilePoint.speed,
    ),
    y: accDecDirectionAnalysisProfilePoints.map(
      (accDecDirectionAnalysisProfilePoint) => accDecDirectionAnalysisProfilePoint.acc,
    ),
  });
  return {
    markerTrace: ({
      traceNameSuffix,
      accDecDirectionAnalysisProfilePoints,
      markerSize,
      markerOpacity,
    }) => ({
      name: `${fileName} ${traceNameSuffix}`,
      type: "scattergl",
      mode: "markers",
      ...buildSpeedAccSeries(accDecDirectionAnalysisProfilePoints),
      customdata: accDecDirectionAnalysisProfilePoints.map((accDecDirectionAnalysisProfilePoint) =>
        buildAccDecDirectionAnalysisProfileHoverCustomData(
          accDecDirectionAnalysisProfilePoint,
          traceNameSuffix,
        ),
      ),
      marker: {
        size: markerSize,
        color: hexToRgba(analysisProfileColor, markerOpacity),
      },
      hovertemplate: accDecDirectionAnalysisProfileHoverTemplate,
      showlegend: true,
    }),
    fitLine: (
      accDecDirectionAnalysisProfileIntercept,
      accDecDirectionAnalysisProfileZeroCrossingSpeed,
    ) => ({
      name: `${fileName} fit`,
      type: "scatter",
      mode: "lines",
      x: [0, accDecDirectionAnalysisProfileZeroCrossingSpeed],
      y: [accDecDirectionAnalysisProfileIntercept, 0],
      line: {
        color: analysisProfileColor,
        width: 2,
      },
      hovertemplate: accDecDirectionAnalysisProfileHoverTemplate,
      showlegend: true,
    }),
    buildAccDecDirectionAnalysisProfilePointsAroundChosenAnalysisPointTrace: (
      accDecDirectionAnalysisProfilePointsAroundChosenAnalysisPoint,
      chosenAnalysisPointIndexes,
    ) => ({
      name: `${fileName} around chosen`,
      type: "scatter",
      mode: "lines+markers",
      ...buildSpeedAccSeries(accDecDirectionAnalysisProfilePointsAroundChosenAnalysisPoint),
      customdata: accDecDirectionAnalysisProfilePointsAroundChosenAnalysisPoint.map(
        (accDecDirectionAnalysisProfilePoint) =>
          buildAccDecDirectionAnalysisProfileHoverCustomData(
            accDecDirectionAnalysisProfilePoint,
            "around chosen",
          ),
      ),
      line: {
        color: analysisProfileColor,
        width: 1.5,
      },
      marker: {
        size: accDecDirectionAnalysisProfilePointsAroundChosenAnalysisPoint.map(
          (accDecDirectionAnalysisProfilePoint) =>
            chosenAnalysisPointIndexes.has(accDecDirectionAnalysisProfilePoint.timeSeriesIndex)
              ? 0
              : 4,
        ),
        color: analysisProfileColor,
      },
      hovertemplate: accDecDirectionAnalysisProfileHoverTemplate,
      showlegend: false,
    }),
    buildChosenAnalysisPointsTrace: (accDecDirectionAnalysisProfilePoints) => ({
      name: `${fileName} user chosen`,
      type: "scatter",
      mode: "markers",
      ...buildSpeedAccSeries(accDecDirectionAnalysisProfilePoints),
      customdata: accDecDirectionAnalysisProfilePoints.map((accDecDirectionAnalysisProfilePoint) =>
        buildAccDecDirectionAnalysisProfileHoverCustomData(
          accDecDirectionAnalysisProfilePoint,
          "user chosen",
        ),
      ),
      marker: {
        size: 7,
        color: analysisProfileColor,
        symbol: "diamond",
      },
      hovertemplate: accDecDirectionAnalysisProfileHoverTemplate,
      showlegend: false,
    }),
  };
}
function buildAccDecDirectionAnalysisProfilePointsByLabelAndRangeValues(
  accDecDirectionAnalysisProfilePoints,
) {
  const pointsByLabel = {
    excluded: [],
    included: [],
    selected: [],
  };
  let maxMetricValue = Number.NEGATIVE_INFINITY;
  let maxIncludedSpeed = Number.NEGATIVE_INFINITY;
  accDecDirectionAnalysisProfilePoints.forEach((accDecDirectionAnalysisProfilePoint) => {
    if (accDecDirectionAnalysisProfilePoint.acc > maxMetricValue)
      maxMetricValue = accDecDirectionAnalysisProfilePoint.acc;
    if (
      accDecDirectionAnalysisProfilePoint.label === "included" ||
      accDecDirectionAnalysisProfilePoint.label === "selected"
    ) {
      if (accDecDirectionAnalysisProfilePoint.speed > maxIncludedSpeed)
        maxIncludedSpeed = accDecDirectionAnalysisProfilePoint.speed;
    }
    pointsByLabel[accDecDirectionAnalysisProfilePoint.label].push(
      accDecDirectionAnalysisProfilePoint,
    );
  });
  return {
    pointsByLabel,
    maxMetricValue,
    maxIncludedSpeed,
  };
}
function buildChosenAnalysisPointsTraces(
  traceBuilders,
  metricAccDecDirectionAnalysisProfilePoints,
  { chosenAnalysisPointsForFile, beforeChosenAnalysisPointsCount, afterChosenAnalysisPointsCount },
) {
  if (!chosenAnalysisPointsForFile.length) return [];
  const chosenAnalysisPointIndexes = new Set(
    chosenAnalysisPointsForFile.map(
      (chosenAnalysisPointForFile) => chosenAnalysisPointForFile.timeSeriesIndex,
    ),
  );
  const chosenAnalysisPointTraces = [];
  const chosenAccDecDirectionAnalysisProfilePoints = [];
  chosenAnalysisPointsForFile.forEach((chosenAnalysisPointForFile) => {
    const accDecDirectionAnalysisProfilePointsAroundChosenAnalysisPoint =
      getPointsAroundChosenAnalysisPoint(
        metricAccDecDirectionAnalysisProfilePoints,
        chosenAnalysisPointForFile,
        beforeChosenAnalysisPointsCount,
        afterChosenAnalysisPointsCount,
      );
    if (accDecDirectionAnalysisProfilePointsAroundChosenAnalysisPoint.length > 1) {
      chosenAnalysisPointTraces.push(
        traceBuilders.buildAccDecDirectionAnalysisProfilePointsAroundChosenAnalysisPointTrace(
          accDecDirectionAnalysisProfilePointsAroundChosenAnalysisPoint,
          chosenAnalysisPointIndexes,
        ),
      );
    }
    const chosenAccDecDirectionAnalysisProfilePoint =
      metricAccDecDirectionAnalysisProfilePoints.find(
        (accDecDirectionAnalysisProfilePoint) =>
          accDecDirectionAnalysisProfilePoint.timeSeriesIndex ===
          chosenAnalysisPointForFile.timeSeriesIndex,
      );
    if (chosenAccDecDirectionAnalysisProfilePoint) {
      chosenAccDecDirectionAnalysisProfilePoints.push(chosenAccDecDirectionAnalysisProfilePoint);
    }
  });
  if (chosenAccDecDirectionAnalysisProfilePoints.length > 0) {
    chosenAnalysisPointTraces.push(
      traceBuilders.buildChosenAnalysisPointsTrace(chosenAccDecDirectionAnalysisProfilePoints),
    );
  }
  return chosenAnalysisPointTraces;
}
function buildFitLineTraceAndMaxMetricValue(
  accDecDirectionAnalysisProfileFit,
  accOrForceMultiplier,
  maxMetricValue,
  traceBuilders,
) {
  if (accDecDirectionAnalysisProfileFit.zero_crossing_speed === null) {
    return {
      fitLineTrace: null,
      maxMetricValue,
    };
  }
  const accDecDirectionAnalysisProfileIntercept =
    accDecDirectionAnalysisProfileFit.intercept * accOrForceMultiplier;
  return {
    fitLineTrace: traceBuilders.fitLine(
      accDecDirectionAnalysisProfileIntercept,
      accDecDirectionAnalysisProfileFit.zero_crossing_speed,
    ),
    maxMetricValue: Math.max(maxMetricValue, accDecDirectionAnalysisProfileIntercept, 0),
  };
}
function buildAccDecDirectionAnalysisProfileTracesAndShape({
  accDecDirectionMultiplier,
  analysisProfileConfig,
  accDecDirectionAnalysisProfile,
  analysisProfileColor,
  chosenAnalysisPointsTraceConfig,
}) {
  const accOrForceMultiplier =
    accDecDirectionMultiplier *
    (analysisProfileConfig.isForce ? accDecDirectionAnalysisProfile.meta.bodyMass : 1);
  const accDecDirectionAnalysisProfileMinSpeed = accDecDirectionAnalysisProfile.meta.minSpeed;
  const metricAccDecDirectionAnalysisProfilePoints = accDecDirectionAnalysisProfile.points.map(
    (accDecDirectionAnalysisProfilePoint) => ({
      ...accDecDirectionAnalysisProfilePoint,
      acc: accDecDirectionAnalysisProfilePoint.acc * accOrForceMultiplier,
    }),
  );
  const { pointsByLabel, maxMetricValue, maxIncludedSpeed } =
    buildAccDecDirectionAnalysisProfilePointsByLabelAndRangeValues(
      metricAccDecDirectionAnalysisProfilePoints,
    );
  const hoverMetricLabel = analysisProfileConfig.isForce
    ? "Force"
    : accDecDirectionMultiplier < 0
      ? "Deceleration"
      : "Acceleration";
  const accDecDirectionAnalysisProfileHoverTemplate = `Speed: %{x:.3f}<br>${hoverMetricLabel}: %{y:.3f}<extra>%{fullData.name}</extra>`;
  const buildAccDecDirectionAnalysisProfileHoverCustomData = (
    accDecDirectionAnalysisProfilePoint,
    traceNameSuffix,
  ) => [
    accDecDirectionAnalysisProfile.fileName,
    accDecDirectionAnalysisProfilePoint.timeSeriesIndex,
    accDecDirectionAnalysisProfilePoint.time,
    accDecDirectionAnalysisProfilePoint.absoluteTime,
    accDecDirectionAnalysisProfilePoint.speed,
    accDecDirectionAnalysisProfilePoint.acc,
    traceNameSuffix,
  ];
  const traceBuilders = buildAccDecDirectionAnalysisProfileTraceBuilders({
    fileName: accDecDirectionAnalysisProfile.fileName,
    analysisProfileColor,
    buildAccDecDirectionAnalysisProfileHoverCustomData,
    accDecDirectionAnalysisProfileHoverTemplate,
  });
  const accDecDirectionAnalysisProfileTraces = ANALYSIS_PROFILE_MARKER_TRACE_CONFIG.map(
    ({ traceNameSuffix, accDecDirectionAnalysisProfilePointLabel, markerOpacity, markerSize }) =>
      traceBuilders.markerTrace({
        traceNameSuffix,
        accDecDirectionAnalysisProfilePoints:
          pointsByLabel[accDecDirectionAnalysisProfilePointLabel],
        markerOpacity,
        markerSize,
      }),
  );
  const fitLineTraceAndMaxMetricValue = buildFitLineTraceAndMaxMetricValue(
    accDecDirectionAnalysisProfile.accDecDirectionAnalysisProfileFit,
    accOrForceMultiplier,
    maxMetricValue,
    traceBuilders,
  );
  if (fitLineTraceAndMaxMetricValue.fitLineTrace) {
    accDecDirectionAnalysisProfileTraces.push(fitLineTraceAndMaxMetricValue.fitLineTrace);
  }
  accDecDirectionAnalysisProfileTraces.push(
    ...buildChosenAnalysisPointsTraces(
      traceBuilders,
      metricAccDecDirectionAnalysisProfilePoints,
      chosenAnalysisPointsTraceConfig,
    ),
  );
  return {
    accDecDirectionAnalysisProfileTraces,
    accDecDirectionAnalysisProfileMinSpeedLine: buildAccDecDirectionAnalysisProfileMinSpeedLine(
      accDecDirectionAnalysisProfileMinSpeed,
    ),
    accDecDirectionAnalysisProfileMinSpeed,
    accDecDirectionAnalysisProfileMaxSpeed: maxIncludedSpeed,
    accDecDirectionAnalysisProfileMaxMetricValue: fitLineTraceAndMaxMetricValue.maxMetricValue,
  };
}
export function buildAccDecDirectionAnalysisProfiles(
  visibleAnalysisResults,
  isAccDecDirectionHidden,
) {
  return Object.fromEntries(
    ACC_DEC_DIRECTIONS.map((accDecDirection) => [
      accDecDirection,
      buildAccDecDirectionAnalysisProfilesForAccDecDirection(
        visibleAnalysisResults,
        isAccDecDirectionHidden,
        accDecDirection,
      ),
    ]),
  );
}
export function buildAccDecDirectionAnalysisProfileChartData({
  chosenAnalysisPoints,
  accDecDirectionAnalysisProfiles,
  colorMap,
  accDecDirectionMultiplier,
  analysisProfileConfig,
  beforeChosenAnalysisPointsCount,
  afterChosenAnalysisPointsCount,
}) {
  const chosenAnalysisPointsByFileName = groupPointsByFileName(chosenAnalysisPoints);
  const accDecDirectionAnalysisProfileTraces = [];
  const accDecDirectionAnalysisProfileShapes = [];
  let globalMinSpeed = Number.POSITIVE_INFINITY;
  let globalMaxSpeed = Number.NEGATIVE_INFINITY;
  let globalMaxMetricValue = Number.NEGATIVE_INFINITY;
  accDecDirectionAnalysisProfiles.forEach((accDecDirectionAnalysisProfile) => {
    const accDecDirectionAnalysisProfileTracesAndShape =
      buildAccDecDirectionAnalysisProfileTracesAndShape({
        accDecDirectionAnalysisProfile,
        analysisProfileColor: colorMap[accDecDirectionAnalysisProfile.fileName],
        accDecDirectionMultiplier,
        analysisProfileConfig,
        chosenAnalysisPointsTraceConfig: {
          chosenAnalysisPointsForFile:
            chosenAnalysisPointsByFileName.get(accDecDirectionAnalysisProfile.fileName) ?? [],
          beforeChosenAnalysisPointsCount,
          afterChosenAnalysisPointsCount,
        },
      });
    accDecDirectionAnalysisProfileTraces.push(
      ...accDecDirectionAnalysisProfileTracesAndShape.accDecDirectionAnalysisProfileTraces,
    );
    accDecDirectionAnalysisProfileShapes.push(
      accDecDirectionAnalysisProfileTracesAndShape.accDecDirectionAnalysisProfileMinSpeedLine,
    );
    globalMinSpeed = Math.min(
      globalMinSpeed,
      accDecDirectionAnalysisProfileTracesAndShape.accDecDirectionAnalysisProfileMinSpeed,
    );
    globalMaxSpeed = Math.max(
      globalMaxSpeed,
      accDecDirectionAnalysisProfileTracesAndShape.accDecDirectionAnalysisProfileMaxSpeed,
    );
    globalMaxMetricValue = Math.max(
      globalMaxMetricValue,
      accDecDirectionAnalysisProfileTracesAndShape.accDecDirectionAnalysisProfileMaxMetricValue,
    );
  });
  return {
    accDecDirectionAnalysisProfileTraces,
    accDecDirectionAnalysisProfileShapes,
    globalMinSpeed,
    globalMaxSpeed,
    globalMaxMetricValue,
  };
}
export function getChosenAnalysisPointsFromPlotlyEvent(plotlySelectionEvent) {
  return (plotlySelectionEvent?.points ?? [])
    .map((plotlyPoint) => plotlyPoint?.customdata)
    .filter(Array.isArray)
    .map((accDecDirectionAnalysisProfilePointCustomData) => ({
      fileName: accDecDirectionAnalysisProfilePointCustomData[0],
      timeSeriesIndex: accDecDirectionAnalysisProfilePointCustomData[1],
      relativeTime: accDecDirectionAnalysisProfilePointCustomData[2],
      absoluteTime: accDecDirectionAnalysisProfilePointCustomData[3],
      speed: accDecDirectionAnalysisProfilePointCustomData[4],
      metricValue: accDecDirectionAnalysisProfilePointCustomData[5],
      traceNameSuffix: accDecDirectionAnalysisProfilePointCustomData[6],
    }));
}
export function buildAccDecDirectionAnalysisProfileChartLayout({
  accDecDirectionAnalysisProfileChartTitle,
  globalMinSpeed,
  globalMaxSpeed,
  accDecDirectionAnalysisProfileChartYAxisTitle,
  globalMaxMetricValue,
  accDecDirectionAnalysisProfileShapes,
}) {
  const blackFont = {
    color: cssVar("--black"),
  };
  return {
    title: {
      text: accDecDirectionAnalysisProfileChartTitle,
      font: blackFont,
    },
    font: blackFont,
    uirevision: accDecDirectionAnalysisProfileChartTitle,
    margin: {
      l: 50,
      r: 20,
      t: 40,
      b: 110,
    },
    xaxis: {
      title: {
        text: "Speed (m/s)",
        font: blackFont,
      },
      tickfont: blackFont,
      range: [globalMinSpeed, globalMaxSpeed],
    },
    yaxis: {
      title: {
        text: accDecDirectionAnalysisProfileChartYAxisTitle,
        font: blackFont,
      },
      tickfont: blackFont,
      range: [0, Math.max(0, globalMaxMetricValue)],
    },
    showlegend: true,
    shapes: [
      ...accDecDirectionAnalysisProfileShapes,
      {
        type: "line",
        x0: 0,
        x1: 1,
        y0: 0,
        y1: 0,
        xref: "paper",
        yref: "y",
        line: buildDashedLine(),
      },
    ],
    legend: buildHorizontalLegend(-0.22),
  };
}

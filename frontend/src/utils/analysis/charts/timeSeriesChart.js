import { cssVar } from "../../shared/conversions";
import { relativeTimeSeriesToAbsoluteTimes, hexToRgba } from "../formatters";

import {
  buildHorizontalLegend,
  getPointsAroundChosenAnalysisPoint,
  groupPointsByFileName,
} from "./shared";
const TIME_SERIES_HOVER_TEMPLATE =
  "Time: %{customdata[0]}<br>%{customdata[1]}: %{y:.3f}<extra>%{fullData.name}</extra>";
export function buildCombinedTimeSeries({
  visibleAnalysisResults,
  colorMap,
  timeMode,
  speedMultiplier,
  analysisProfileConfig,
}) {
  const speedChartSeries = [];
  const accChartSeries = [];
  visibleAnalysisResults.forEach((analysisResult) => {
    const addMetricTimeSeriesToChartSeries = (
      chartSeries,
      timeSeriesKey,
      massOrSpeedMultiplier,
    ) => {
      chartSeries.push({
        name: analysisResult.file_name,
        values: analysisResult.analysis.time_series[timeSeriesKey].map(
          (metricValue) => metricValue * massOrSpeedMultiplier,
        ),
        color: colorMap[analysisResult.file_name],
        x: analysisResult.analysis.time_series.relative_times,
        labels:
          timeMode === "absolute"
            ? relativeTimeSeriesToAbsoluteTimes(analysisResult.analysis.time_series)
            : [],
      });
    };
    addMetricTimeSeriesToChartSeries(speedChartSeries, "speeds", speedMultiplier);
    addMetricTimeSeriesToChartSeries(
      accChartSeries,
      "accs",
      analysisProfileConfig.isForce ? analysisResult.analysis.meta.body_mass_kg : 1,
    );
  });
  return {
    speedChartSeries,
    accChartSeries,
  };
}
export function buildSpeedReferenceLines({
  visibleAnalysisResults,
  isAccDecDirectionHidden,
  speedMultiplier,
  colorMap,
}) {
  return visibleAnalysisResults.flatMap((analysisResult) => {
    const referenceSpeedValues = new Set();
    if (!isAccDecDirectionHidden(analysisResult.file_name, "acc")) {
      referenceSpeedValues.add(analysisResult.analysis.meta.min_acc_speed_m_per_s);
    }
    if (!isAccDecDirectionHidden(analysisResult.file_name, "dec")) {
      referenceSpeedValues.add(analysisResult.analysis.meta.min_dec_speed_m_per_s);
    }
    return [...referenceSpeedValues].map((referenceSpeedValue) => ({
      y: referenceSpeedValue * speedMultiplier,
      color: colorMap[analysisResult.file_name],
      width: 1.5,
      dash: "dash",
    }));
  });
}
function buildChosenAnalysisPointsTimeSeriesTracesAndShapesForFile({
  timeSeriesChartSeries,
  chosenAnalysisPoints,
  beforeChosenAnalysisPointsCount,
  afterChosenAnalysisPointsCount,
  buildTimeSeriesHoverCustomData,
}) {
  const traces = [];
  const shapes = [];
  const timeSeriesPoints = timeSeriesChartSeries.x.map((x, timeSeriesIndex) => ({
    timeSeriesIndex,
    x,
    y: timeSeriesChartSeries.values[timeSeriesIndex],
  }));
  const chosenAnalysisPointIndexes = new Set(
    chosenAnalysisPoints.map((chosenAnalysisPoint) => chosenAnalysisPoint.timeSeriesIndex),
  );
  chosenAnalysisPoints.forEach((chosenAnalysisPoint) => {
    const chosenPoint = timeSeriesPoints[chosenAnalysisPoint.timeSeriesIndex];
    shapes.push({
      type: "line",
      xref: "x",
      yref: "paper",
      x0: chosenPoint.x,
      x1: chosenPoint.x,
      y0: 0,
      y1: 1,
      line: {
        color: timeSeriesChartSeries.color,
        width: 2,
        dash: "dot",
      },
    });
    const timeSeriesPointsAroundChosenAnalysisPoint = getPointsAroundChosenAnalysisPoint(
      timeSeriesPoints,
      chosenAnalysisPoint,
      beforeChosenAnalysisPointsCount,
      afterChosenAnalysisPointsCount,
    );
    if (timeSeriesPointsAroundChosenAnalysisPoint.length > 1) {
      const timeSeriesPointAroundChosenAnalysisPointMarkerSizes =
        timeSeriesPointsAroundChosenAnalysisPoint.map((timeSeriesPointAroundChosenAnalysisPoint) =>
          chosenAnalysisPointIndexes.has(timeSeriesPointAroundChosenAnalysisPoint.timeSeriesIndex)
            ? 0
            : 7,
        );
      traces.push({
        name: `${timeSeriesChartSeries.name} around chosen`,
        type: "scatter",
        mode: "lines+markers",
        x: timeSeriesPointsAroundChosenAnalysisPoint.map(
          (timeSeriesPointAroundChosenAnalysisPoint) => timeSeriesPointAroundChosenAnalysisPoint.x,
        ),
        y: timeSeriesPointsAroundChosenAnalysisPoint.map(
          (timeSeriesPointAroundChosenAnalysisPoint) => timeSeriesPointAroundChosenAnalysisPoint.y,
        ),
        customdata: timeSeriesPointsAroundChosenAnalysisPoint.map(
          (timeSeriesPointAroundChosenAnalysisPoint) =>
            buildTimeSeriesHoverCustomData(
              timeSeriesPointAroundChosenAnalysisPoint.x,
              timeSeriesPointAroundChosenAnalysisPoint.y,
              timeSeriesPointAroundChosenAnalysisPoint.timeSeriesIndex,
            ),
        ),
        hovertemplate: TIME_SERIES_HOVER_TEMPLATE,
        line: {
          color: timeSeriesChartSeries.color,
          width: 2,
        },
        marker: {
          size: timeSeriesPointAroundChosenAnalysisPointMarkerSizes,
          color: timeSeriesChartSeries.color,
          line: {
            width: 0,
          },
        },
        showlegend: false,
      });
    }
    traces.push({
      name: `${timeSeriesChartSeries.name} selected`,
      type: "scatter",
      mode: "markers",
      x: [chosenPoint.x],
      y: [chosenPoint.y],
      customdata: [
        buildTimeSeriesHoverCustomData(
          chosenPoint.x,
          chosenPoint.y,
          chosenAnalysisPoint.timeSeriesIndex,
        ),
      ],
      hovertemplate: TIME_SERIES_HOVER_TEMPLATE,
      marker: {
        size: 7,
        color: timeSeriesChartSeries.color,
        symbol: "diamond",
        line: {
          width: 0,
        },
      },
      showlegend: false,
    });
  });
  return {
    traces,
    shapes,
  };
}
export function buildTimeSeriesChartData({
  metricTimeSeriesList,
  chosenAnalysisPoints,
  formatTimeSeriesChartXHoverLabel,
  timeSeriesChartValueLabelFormatter,
  beforeChosenAnalysisPointsCount,
  afterChosenAnalysisPointsCount,
  timeSeriesChartSpeedReferenceLines,
}) {
  if (!metricTimeSeriesList.length) return null;
  const chosenAnalysisPointsByFileName = groupPointsByFileName(chosenAnalysisPoints);
  const traces = [];
  const timeSeriesLayoutShapes = [];
  metricTimeSeriesList.forEach((timeSeriesChartSeries) => {
    const buildTimeSeriesHoverCustomData = (x, y, timeSeriesIndex) => [
      formatTimeSeriesChartXHoverLabel(x, timeSeriesChartSeries.labels[timeSeriesIndex]),
      timeSeriesChartValueLabelFormatter(y, timeSeriesChartSeries, timeSeriesIndex),
    ];
    traces.push({
      name: timeSeriesChartSeries.name,
      type: "scattergl",
      mode: "lines",
      x: timeSeriesChartSeries.x,
      y: timeSeriesChartSeries.values,
      customdata: timeSeriesChartSeries.x.map((x, timeSeriesIndex) =>
        buildTimeSeriesHoverCustomData(
          x,
          timeSeriesChartSeries.values[timeSeriesIndex],
          timeSeriesIndex,
        ),
      ),
      hovertemplate: TIME_SERIES_HOVER_TEMPLATE,
      line: {
        color: hexToRgba(timeSeriesChartSeries.color, 0.4),
        width: 1.5,
      },
    });
    const chosenAnalysisPointsForFile = chosenAnalysisPointsByFileName.get(
      timeSeriesChartSeries.name,
    );
    if (!chosenAnalysisPointsForFile) return;
    const chosenAnalysisPointsTimeSeriesTracesAndShapesForFile =
      buildChosenAnalysisPointsTimeSeriesTracesAndShapesForFile({
        timeSeriesChartSeries,
        chosenAnalysisPoints: chosenAnalysisPointsForFile,
        beforeChosenAnalysisPointsCount,
        afterChosenAnalysisPointsCount,
        buildTimeSeriesHoverCustomData,
      });
    traces.push(...chosenAnalysisPointsTimeSeriesTracesAndShapesForFile.traces);
    timeSeriesLayoutShapes.push(...chosenAnalysisPointsTimeSeriesTracesAndShapesForFile.shapes);
  });
  const longestTimeSeriesChartSeries = metricTimeSeriesList.reduce(
    (longestTimeSeriesChartSeriesSoFar, timeSeriesChartSeries) =>
      timeSeriesChartSeries.x.length > longestTimeSeriesChartSeriesSoFar.x.length
        ? timeSeriesChartSeries
        : longestTimeSeriesChartSeriesSoFar,
  );
  return {
    traces,
    shapes: [
      ...timeSeriesLayoutShapes,
      ...timeSeriesChartSpeedReferenceLines.map((yReferenceLine) => ({
        type: "line",
        xref: "paper",
        yref: "y",
        x0: 0,
        x1: 1,
        y0: yReferenceLine.y,
        y1: yReferenceLine.y,
        line: {
          color: yReferenceLine.color,
          width: yReferenceLine.width,
          dash: yReferenceLine.dash,
        },
      })),
    ],
    referenceX: longestTimeSeriesChartSeries.x,
    referenceLabels: longestTimeSeriesChartSeries.labels,
  };
}
export function buildTimeSeriesXAxisTickConfig(
  referenceXValues,
  referenceLabels,
  xTickFormatter,
  visibleMinX,
  visibleMaxX,
) {
  const hasVisibleRange = Number.isFinite(visibleMinX) && Number.isFinite(visibleMaxX);
  const visibleReferenceXPoints = referenceXValues
    .map((referenceXValue, referenceXValueIndex) => ({
      referenceXValue,
      referenceXValueIndex,
    }))
    .filter(
      ({ referenceXValue }) =>
        !hasVisibleRange || (referenceXValue >= visibleMinX && referenceXValue <= visibleMaxX),
    );
  const tickCandidateReferenceXValueIndexes = visibleReferenceXPoints.length
    ? visibleReferenceXPoints.map((referenceXPoint) => referenceXPoint.referenceXValueIndex)
    : [...referenceXValues.keys()];
  const maxTickCount = Math.min(10, tickCandidateReferenceXValueIndexes.length);
  const uniqueTickReferenceXValueIndexes = [
    ...new Set(
      [...Array(maxTickCount).keys()].map(
        (tickIndex) =>
          tickCandidateReferenceXValueIndexes[
            Math.round(
              (tickIndex * (tickCandidateReferenceXValueIndexes.length - 1)) /
                Math.max(maxTickCount - 1, 1),
            )
          ],
      ),
    ),
  ];
  return {
    tickmode: "array",
    tickvals: uniqueTickReferenceXValueIndexes.map(
      (uniqueTickReferenceXValueIndex) => referenceXValues[uniqueTickReferenceXValueIndex],
    ),
    ticktext: uniqueTickReferenceXValueIndexes.map((uniqueTickReferenceXValueIndex) =>
      xTickFormatter(
        referenceXValues[uniqueTickReferenceXValueIndex],
        referenceLabels[uniqueTickReferenceXValueIndex],
      ),
    ),
  };
}
export function buildTimeSeriesChartLayout({
  timeSeriesChartTitle,
  timeSeriesChartXAxisTitle,
  shouldIncludeZeroOnTimeSeriesChartXAxis,
  timeSeriesXAxisTickConfig,
  timeSeriesChartYAxisTitle,
  timeSeriesLayoutShapes,
}) {
  const blackFont = {
    color: cssVar("--black"),
  };
  return {
    title: {
      text: timeSeriesChartTitle,
      font: blackFont,
    },
    font: blackFont,
    uirevision: timeSeriesChartTitle,
    margin: {
      l: 50,
      r: 20,
      t: 40,
      b: 110,
    },
    xaxis: {
      title: {
        text: timeSeriesChartXAxisTitle,
        font: blackFont,
      },
      tickfont: blackFont,
      type: "linear",
      rangemode: shouldIncludeZeroOnTimeSeriesChartXAxis ? "tozero" : undefined,
      ...timeSeriesXAxisTickConfig,
    },
    yaxis: {
      title: {
        text: timeSeriesChartYAxisTitle,
        font: blackFont,
      },
      tickfont: blackFont,
    },
    shapes: timeSeriesLayoutShapes,
    showlegend: true,
    legend: buildHorizontalLegend(-0.22),
  };
}

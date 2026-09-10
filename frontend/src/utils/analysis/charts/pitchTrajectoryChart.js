import { cssVar } from "../../shared/conversions";
import { relativeTimeSeriesToAbsoluteTimes, hexToRgba, safeScaleByMass } from "../formatters";

import {
  buildHorizontalLegend,
  getPointsAroundChosenAnalysisPoint,
  groupPointsByFileName,
} from "./shared";
const PITCH_LENGTH = 105;
const PITCH_WIDTH = 68;
const PITCH_VIEW_MARGIN = 4;
const PITCH_CENTER_X = PITCH_LENGTH / 2;
const PITCH_ZONE_LENGTH = PITCH_LENGTH / 3;
export function buildPitchTrajectoryPointSeries(analysisResult) {
  const timeSeries = analysisResult.analysis.time_series;
  const absoluteTimes = relativeTimeSeriesToAbsoluteTimes(timeSeries);
  return timeSeries.speeds.map((speed, timeSeriesIndex) => {
    const acc = timeSeries.accs[timeSeriesIndex];
    return {
      timeSeriesIndex,
      time: timeSeries.relative_times[timeSeriesIndex],
      absoluteTime: absoluteTimes[timeSeriesIndex],
      speed,
      acc,
      force: safeScaleByMass(acc, analysisResult.analysis.meta.body_mass_kg),
      x: timeSeries.x[timeSeriesIndex],
      y: timeSeries.y[timeSeriesIndex],
      fileName: analysisResult.file_name,
    };
  });
}
function dedupePitchTrajectoryPointsAroundChosenAnalysisPointByTimeSeriesIndex(
  pitchTrajectoryPoints,
) {
  return [
    ...new Map(
      pitchTrajectoryPoints.map((pitchTrajectoryPoint) => [
        pitchTrajectoryPoint.timeSeriesIndex,
        pitchTrajectoryPoint,
      ]),
    ).values(),
  ];
}
function buildPitchTrajectoryHoverTemplate(analysisProfileConfig, fileName) {
  return `${fileName}<br>Time: %{customdata[0]}<br>X: %{x:.2f} m<br>Y: %{y:.2f} m<br>Speed: %{customdata[1]:.3f} m/s<br>${analysisProfileConfig.metricLabel}: %{customdata[2]:.3f} ${analysisProfileConfig.metricUnit}<extra></extra>`;
}
export function buildPitchTrajectoryChartTraces({
  chosenAnalysisPoints,
  pitchTrajectoryPointSeriesList,
  colorMap,
  formatAnalysisTimeLabel,
  analysisProfileConfig,
  beforeChosenAnalysisPointsCount,
  afterChosenAnalysisPointsCount,
}) {
  const pitchTrajectoryChartTraces = [];
  const chosenAnalysisPointsByFileName = groupPointsByFileName(chosenAnalysisPoints);
  pitchTrajectoryPointSeriesList.forEach((pitchTrajectoryPoints) => {
    const pitchTrajectoryColor = colorMap[pitchTrajectoryPoints[0].fileName];
    const buildPitchTrajectoryHoverCustomData = (pitchTrajectoryPoint) => [
      formatAnalysisTimeLabel(pitchTrajectoryPoint.time, pitchTrajectoryPoint.absoluteTime),
      pitchTrajectoryPoint.speed,
      analysisProfileConfig.isForce ? pitchTrajectoryPoint.force : pitchTrajectoryPoint.acc,
    ];
    pitchTrajectoryChartTraces.push({
      type: "scatter",
      mode: "lines",
      x: pitchTrajectoryPoints.map((pitchTrajectoryPoint) => pitchTrajectoryPoint.x),
      y: pitchTrajectoryPoints.map((pitchTrajectoryPoint) => pitchTrajectoryPoint.y),
      line: {
        color: hexToRgba(pitchTrajectoryColor, 0.75),
        width: 2,
      },
      name: pitchTrajectoryPoints[0].fileName,
      customdata: pitchTrajectoryPoints.map(buildPitchTrajectoryHoverCustomData),
      hovertemplate: buildPitchTrajectoryHoverTemplate(
        analysisProfileConfig,
        pitchTrajectoryPoints[0].fileName,
      ),
    });
    const chosenAnalysisPointsForFile = chosenAnalysisPointsByFileName.get(
      pitchTrajectoryPoints[0].fileName,
    );
    if (!chosenAnalysisPointsForFile) return;
    const addPitchTrajectoryPointsTrace = (
      traceName,
      pitchTrajectoryPointsForTrace,
      markerStyle,
    ) => {
      pitchTrajectoryChartTraces.push({
        type: "scatter",
        mode: "markers",
        x: pitchTrajectoryPointsForTrace.map((pitchTrajectoryPoint) => pitchTrajectoryPoint.x),
        y: pitchTrajectoryPointsForTrace.map((pitchTrajectoryPoint) => pitchTrajectoryPoint.y),
        customdata: pitchTrajectoryPointsForTrace.map(buildPitchTrajectoryHoverCustomData),
        marker: markerStyle,
        name: traceName,
        hovertemplate: buildPitchTrajectoryHoverTemplate(
          analysisProfileConfig,
          pitchTrajectoryPoints[0].fileName,
        ),
        showlegend: false,
      });
    };
    addPitchTrajectoryPointsTrace(
      `${pitchTrajectoryPoints[0].fileName} around chosen`,
      dedupePitchTrajectoryPointsAroundChosenAnalysisPointByTimeSeriesIndex(
        chosenAnalysisPointsForFile.flatMap((chosenAnalysisPointForFile) =>
          getPointsAroundChosenAnalysisPoint(
            pitchTrajectoryPoints,
            chosenAnalysisPointForFile,
            beforeChosenAnalysisPointsCount,
            afterChosenAnalysisPointsCount,
          ),
        ),
      ),
      {
        size: 7,
        color: pitchTrajectoryColor,
        opacity: 0.9,
      },
    );
    addPitchTrajectoryPointsTrace(
      `${pitchTrajectoryPoints[0].fileName} chosen points`,
      chosenAnalysisPointsForFile.map(
        (chosenAnalysisPointForFile) =>
          pitchTrajectoryPoints[chosenAnalysisPointForFile.timeSeriesIndex],
      ),
      {
        size: 11,
        symbol: "diamond",
        color: pitchTrajectoryColor,
        line: {
          width: 0,
        },
      },
    );
  });
  return pitchTrajectoryChartTraces;
}
function buildPitchShapes(cssBlack) {
  const halfPitchWidth = PITCH_WIDTH / 2;
  const buildPitchLineStyle = (pitchLineWidth, pitchLineDashStyle) => ({
    color: cssBlack,
    width: pitchLineWidth,
    ...(pitchLineDashStyle && {
      dash: pitchLineDashStyle,
    }),
  });
  const buildPitchVerticalLine = (
    pitchVerticalLineXPosition,
    pitchVerticalLineWidth,
    pitchVerticalLineDashStyle,
  ) => ({
    type: "line",
    x0: pitchVerticalLineXPosition,
    x1: pitchVerticalLineXPosition,
    y0: -halfPitchWidth,
    y1: halfPitchWidth,
    line: buildPitchLineStyle(pitchVerticalLineWidth, pitchVerticalLineDashStyle),
  });
  const buildPenaltyBoxShape = (penaltyBoxLeftXPosition, penaltyBoxRightXPosition) => ({
    type: "rect",
    x0: penaltyBoxLeftXPosition,
    x1: penaltyBoxRightXPosition,
    y0: -20.16,
    y1: 20.16,
    line: buildPitchLineStyle(1.5),
  });
  return [
    {
      type: "rect",
      x0: 0,
      x1: PITCH_LENGTH,
      y0: -halfPitchWidth,
      y1: halfPitchWidth,
      line: buildPitchLineStyle(2),
    },
    buildPitchVerticalLine(PITCH_CENTER_X, 1.5),
    {
      type: "circle",
      x0: PITCH_CENTER_X - 9.15,
      x1: PITCH_CENTER_X + 9.15,
      y0: -9.15,
      y1: 9.15,
      line: buildPitchLineStyle(1.5),
    },
    buildPenaltyBoxShape(0, 16.5),
    buildPenaltyBoxShape(PITCH_LENGTH - 16.5, PITCH_LENGTH),
    buildPitchVerticalLine(PITCH_ZONE_LENGTH, 1, "dot"),
    buildPitchVerticalLine(PITCH_ZONE_LENGTH * 2, 1, "dot"),
  ];
}
function buildPitchAnnotations(cssBlack) {
  const pitchAnnotationConfigs = [
    {
      annotationXPosition: PITCH_ZONE_LENGTH / 2,
      annotationText: "Left third",
      annotationFontSize: 12,
    },
    {
      annotationXPosition: PITCH_LENGTH / 2,
      annotationText: "Middle third",
      annotationFontSize: 12,
    },
    {
      annotationXPosition: PITCH_ZONE_LENGTH * 2.5,
      annotationText: "Right third",
      annotationFontSize: 12,
    },
    {
      annotationXPosition: PITCH_ZONE_LENGTH,
      annotationText: `${PITCH_ZONE_LENGTH.toFixed(0)} m`,
      annotationFontSize: 11,
    },
    {
      annotationXPosition: PITCH_ZONE_LENGTH * 2,
      annotationText: `${(PITCH_ZONE_LENGTH * 2).toFixed(0)} m`,
      annotationFontSize: 11,
    },
  ];
  return pitchAnnotationConfigs.map(
    ({ annotationXPosition, annotationText, annotationFontSize }) => ({
      x: annotationXPosition,
      y: PITCH_WIDTH / 2 + 2.5,
      text: annotationText,
      showarrow: false,
      font: {
        color: cssBlack,
        size: annotationFontSize,
      },
      xanchor: "center",
      yanchor: "bottom",
    }),
  );
}
export function buildPitchTrajectoryChartLayout() {
  const cssBlack = cssVar("--black");
  const blackFont = {
    color: cssBlack,
  };
  const buildPitchAxis = (pitchAxisTitle, pitchAxisRange, pitchTickValues) => ({
    title: {
      text: pitchAxisTitle,
      font: blackFont,
    },
    range: pitchAxisRange,
    tickmode: "array",
    tickvals: pitchTickValues,
    ticktext: pitchTickValues.map(String),
    showgrid: true,
    gridcolor: hexToRgba(cssBlack, 0.1),
    zeroline: false,
  });
  return {
    title: {
      text: "Player Pitch Trajectory",
      font: blackFont,
    },
    font: blackFont,
    uirevision: "pitchTrajectory",
    paper_bgcolor: "white",
    plot_bgcolor: "white",
    margin: {
      l: 56,
      r: 16,
      t: 40,
      b: 54,
    },
    xaxis: buildPitchAxis(
      "Pitch length (m)",
      [-PITCH_VIEW_MARGIN, PITCH_LENGTH + PITCH_VIEW_MARGIN],
      [0, 16.5, PITCH_CENTER_X, PITCH_LENGTH - 16.5, PITCH_LENGTH],
    ),
    yaxis: {
      ...buildPitchAxis(
        "Pitch width (m)",
        [-PITCH_WIDTH / 2 - PITCH_VIEW_MARGIN, PITCH_WIDTH / 2 + PITCH_VIEW_MARGIN],
        [-PITCH_WIDTH / 2, -20.16, 0, 20.16, PITCH_WIDTH / 2],
      ),
      scaleanchor: "x",
      scaleratio: 1,
    },
    shapes: buildPitchShapes(cssBlack),
    annotations: buildPitchAnnotations(cssBlack),
    showlegend: true,
    legend: buildHorizontalLegend(-0.14),
  };
}

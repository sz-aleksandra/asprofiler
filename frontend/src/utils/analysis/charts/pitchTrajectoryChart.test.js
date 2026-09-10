import { describe, it, expect, vi } from "vitest";

vi.mock("../../shared/conversions", async () => {
  const actualConversions = await vi.importActual("../../shared/conversions");
  return {
    ...actualConversions,
    cssVar: () => "#111111",
  };
});

import { makeAnalysis } from "../../../../test/testUtils";
import { getAnalysisProfileConfig } from "../../analysis/constants";

import {
  buildPitchTrajectoryPointSeries,
  buildPitchTrajectoryChartTraces,
  buildPitchTrajectoryChartLayout,
} from "./pitchTrajectoryChart";

const ACC_DEC_ANALYSIS_PROFILE_CONFIG = getAnalysisProfileConfig("accDecSpeedAnalysisProfile");
const FORCE_VELOCITY_ANALYSIS_PROFILE_CONFIG = getAnalysisProfileConfig(
  "forceVelocityAnalysisProfile",
);

const COLOR_MAP = { "run.csv": "#ff0000" };
const formatAnalysisTimeLabel = (relativeTime) => String(relativeTime);

function makeAnalysisResult(analysisOverrides = {}) {
  return {
    file_name: "run.csv",
    analysis: makeAnalysis({
      time_series: {
        start_time: "00:00:00.0",
        relative_times: [0, 1, 2],
        speeds: [1, 2, 3],
        accs: [0.1, 0.2, 0.3],
        acc_labels: [],
        dec_labels: [],
        x: [10, 11, 12],
        y: [0, 1, 2],
      },
      ...analysisOverrides,
    }),
  };
}

describe("buildPitchTrajectoryPointSeries", () => {
  it("maps time series into pitch trajectory points with force scaled by body mass", () => {
    const pitchTrajectoryPointSeries = buildPitchTrajectoryPointSeries(makeAnalysisResult());
    expect(pitchTrajectoryPointSeries).toHaveLength(3);
    expect(pitchTrajectoryPointSeries[0]).toMatchObject({
      timeSeriesIndex: 0,
      time: 0,
      absoluteTime: 0,
      speed: 1,
      acc: 0.1,
      force: 0.1 * 75,
      x: 10,
      y: 0,
      fileName: "run.csv",
    });
  });
});

describe("buildPitchTrajectoryChartTraces", () => {
  it("returns an empty array when there are no pitch trajectory series", () => {
    expect(
      buildPitchTrajectoryChartTraces({
        pitchTrajectoryPointSeriesList: [],
        colorMap: COLOR_MAP,
        chosenAnalysisPoints: [],
        beforeChosenAnalysisPointsCount: 0,
        afterChosenAnalysisPointsCount: 0,
        formatAnalysisTimeLabel,
        analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
      }),
    ).toEqual([]);
  });

  it("emits one line trace per series preserving raw x/y coordinates", () => {
    const pitchTrajectoryPointSeries = buildPitchTrajectoryPointSeries(makeAnalysisResult());
    const pitchTrajectoryChartTraces = buildPitchTrajectoryChartTraces({
      pitchTrajectoryPointSeriesList: [pitchTrajectoryPointSeries],
      colorMap: COLOR_MAP,
      chosenAnalysisPoints: [],
      beforeChosenAnalysisPointsCount: 0,
      afterChosenAnalysisPointsCount: 0,
      formatAnalysisTimeLabel,
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
    });
    expect(pitchTrajectoryChartTraces).toHaveLength(1);
    expect(pitchTrajectoryChartTraces[0]).toMatchObject({
      type: "scatter",
      mode: "lines",
      name: "run.csv",
      x: [10, 11, 12],
      y: [0, 1, 2],
    });
  });

  it("skips chosen-analysis-point traces when no chosen points match this series", () => {
    const pitchTrajectoryPointSeries = buildPitchTrajectoryPointSeries(makeAnalysisResult());
    const pitchTrajectoryChartTraces = buildPitchTrajectoryChartTraces({
      pitchTrajectoryPointSeriesList: [pitchTrajectoryPointSeries],
      colorMap: COLOR_MAP,
      chosenAnalysisPoints: [{ fileName: "other.csv", timeSeriesIndex: 0 }],
      beforeChosenAnalysisPointsCount: 1,
      afterChosenAnalysisPointsCount: 1,
      formatAnalysisTimeLabel,
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
    });
    expect(pitchTrajectoryChartTraces).toHaveLength(1);
  });

  it("adds around-chosen and chosen marker traces when chosen point matches file", () => {
    const pitchTrajectoryPointSeries = buildPitchTrajectoryPointSeries(makeAnalysisResult());
    const pitchTrajectoryChartTraces = buildPitchTrajectoryChartTraces({
      pitchTrajectoryPointSeriesList: [pitchTrajectoryPointSeries],
      colorMap: COLOR_MAP,
      chosenAnalysisPoints: [{ fileName: "run.csv", timeSeriesIndex: 1 }],
      beforeChosenAnalysisPointsCount: 1,
      afterChosenAnalysisPointsCount: 1,
      formatAnalysisTimeLabel,
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
    });
    const traceNames = pitchTrajectoryChartTraces.map((chartTrace) => chartTrace.name);
    expect(traceNames).toContain("run.csv around chosen");
    expect(traceNames).toContain("run.csv chosen points");
  });

  it("around-chosen window is symmetric around the chosen point index", () => {
    const pitchTrajectoryPointSeries = buildPitchTrajectoryPointSeries(makeAnalysisResult());
    const pitchTrajectoryChartTraces = buildPitchTrajectoryChartTraces({
      pitchTrajectoryPointSeriesList: [pitchTrajectoryPointSeries],
      colorMap: COLOR_MAP,
      chosenAnalysisPoints: [{ fileName: "run.csv", timeSeriesIndex: 1 }],
      beforeChosenAnalysisPointsCount: 1,
      afterChosenAnalysisPointsCount: 1,
      formatAnalysisTimeLabel,
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
    });
    const aroundChosenTrace = pitchTrajectoryChartTraces.find(
      (chartTrace) => chartTrace.name === "run.csv around chosen",
    );
    expect(aroundChosenTrace.x).toHaveLength(3);
  });

  it.each([
    {
      caseName: "customdata metric uses acc for accDec profile config",
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
      expectedMetricValue: 0.1,
    },
    {
      caseName: "customdata metric uses force for force-velocity profile config",
      analysisProfileConfig: FORCE_VELOCITY_ANALYSIS_PROFILE_CONFIG,
      expectedMetricValue: 0.1 * 75,
    },
  ])("$caseName", ({ analysisProfileConfig, expectedMetricValue }) => {
    const pitchTrajectoryPointSeries = buildPitchTrajectoryPointSeries(makeAnalysisResult());
    const pitchTrajectoryChartTraces = buildPitchTrajectoryChartTraces({
      pitchTrajectoryPointSeriesList: [pitchTrajectoryPointSeries],
      colorMap: COLOR_MAP,
      chosenAnalysisPoints: [],
      beforeChosenAnalysisPointsCount: 0,
      afterChosenAnalysisPointsCount: 0,
      formatAnalysisTimeLabel,
      analysisProfileConfig,
    });
    expect(pitchTrajectoryChartTraces[0].customdata[0][2]).toBe(expectedMetricValue);
  });
});

describe("buildPitchTrajectoryChartLayout", () => {
  it("builds pitch layout with locked aspect ratio, shapes, annotations and horizontal legend", () => {
    const pitchTrajectoryChartLayout = buildPitchTrajectoryChartLayout();
    expect(pitchTrajectoryChartLayout.title.text).toBe("Player Pitch Trajectory");
    expect(pitchTrajectoryChartLayout.paper_bgcolor).toBe("white");
    expect(pitchTrajectoryChartLayout.plot_bgcolor).toBe("white");
    expect(pitchTrajectoryChartLayout.yaxis.scaleanchor).toBe("x");
    expect(pitchTrajectoryChartLayout.yaxis.scaleratio).toBe(1);
    expect(pitchTrajectoryChartLayout.shapes.length).toBeGreaterThan(0);
    expect(pitchTrajectoryChartLayout.legend).toEqual({
      orientation: "h",
      x: 0,
      y: -0.14,
      xanchor: "left",
      yanchor: "top",
    });
    const annotationTexts = pitchTrajectoryChartLayout.annotations.map(
      (pitchAnnotation) => pitchAnnotation.text,
    );
    expect(annotationTexts).toEqual(
      expect.arrayContaining(["Left third", "Middle third", "Right third", "35 m", "70 m"]),
    );
  });
});

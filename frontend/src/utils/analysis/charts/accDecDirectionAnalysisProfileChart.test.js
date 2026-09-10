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
  buildAccDecDirectionAnalysisProfiles,
  buildAccDecDirectionAnalysisProfileChartData,
  buildAccDecDirectionAnalysisProfileChartLayout,
  getChosenAnalysisPointsFromPlotlyEvent,
} from "./accDecDirectionAnalysisProfileChart";

const ACC_DEC_ANALYSIS_PROFILE_CONFIG = getAnalysisProfileConfig("accDecSpeedAnalysisProfile");
const FORCE_VELOCITY_ANALYSIS_PROFILE_CONFIG = getAnalysisProfileConfig(
  "forceVelocityAnalysisProfile",
);

const NEVER_HIDDEN = () => false;
const COLOR_MAP = { "run.csv": "#ff0000" };

function makeAnalysisResult(analysisOverrides = {}) {
  return {
    file_name: "run.csv",
    analysis: makeAnalysis({
      acc_profile_fit: { intercept: 5, slope: -0.5, zero_crossing_speed: 10, r_squared: 0.9 },
      dec_profile_fit: { intercept: -5, slope: 0.5, zero_crossing_speed: 10, r_squared: 0.9 },
      time_series: {
        start_time: "00:00:00.0",
        relative_times: [0, 1, 2, 3],
        speeds: [2, 4, 6, 8],
        accs: [1, 2, 3, 4],
        acc_labels: [
          ["e", 1],
          ["i", 2],
          ["s", 1],
        ],
        dec_labels: [
          ["e", 2],
          ["i", 2],
        ],
        x: [],
        y: [],
      },
      ...analysisOverrides,
    }),
  };
}

describe("buildAccDecDirectionAnalysisProfiles", () => {
  it("returns acc/dec keyed maps with per-file profile metadata and per-point labels", () => {
    const accDecDirectionAnalysisProfiles = buildAccDecDirectionAnalysisProfiles(
      [makeAnalysisResult()],
      NEVER_HIDDEN,
    );
    expect(Object.keys(accDecDirectionAnalysisProfiles).sort()).toEqual(["acc", "dec"]);
    expect(accDecDirectionAnalysisProfiles.acc[0].fileName).toBe("run.csv");
    expect(accDecDirectionAnalysisProfiles.acc[0].meta).toEqual({ bodyMass: 75, minSpeed: 3 });
    expect(accDecDirectionAnalysisProfiles.acc[0].points.map((point) => point.label)).toEqual([
      "excluded",
      "included",
      "included",
      "selected",
    ]);
  });

  it("omits an entry when isAccDecDirectionHidden returns true for its direction", () => {
    const accDecDirectionAnalysisProfiles = buildAccDecDirectionAnalysisProfiles(
      [makeAnalysisResult()],
      () => true,
    );
    expect(accDecDirectionAnalysisProfiles.acc).toEqual([]);
    expect(accDecDirectionAnalysisProfiles.dec).toEqual([]);
  });

  it("omits an entry whose direction profile fit is missing", () => {
    const analysisResult = makeAnalysisResult();
    analysisResult.analysis.acc_profile_fit = null;
    const accDecDirectionAnalysisProfiles = buildAccDecDirectionAnalysisProfiles(
      [analysisResult],
      NEVER_HIDDEN,
    );
    expect(accDecDirectionAnalysisProfiles.acc).toEqual([]);
    expect(accDecDirectionAnalysisProfiles.dec).toHaveLength(1);
  });
});

describe("buildAccDecDirectionAnalysisProfileChartData", () => {
  function buildAccDecDirectionAnalysisProfilesForAcc(analysisResult = makeAnalysisResult()) {
    return buildAccDecDirectionAnalysisProfiles([analysisResult], NEVER_HIDDEN).acc;
  }

  it("emits marker traces per label plus fit line and shape at min speed", () => {
    const accDecDirectionAnalysisProfileChartData = buildAccDecDirectionAnalysisProfileChartData({
      accDecDirectionAnalysisProfiles: buildAccDecDirectionAnalysisProfilesForAcc(),
      colorMap: COLOR_MAP,
      accDecDirectionMultiplier: 1,
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
      chosenAnalysisPoints: [],
      beforeChosenAnalysisPointsCount: 0,
      afterChosenAnalysisPointsCount: 0,
    });
    const traceNames =
      accDecDirectionAnalysisProfileChartData.accDecDirectionAnalysisProfileTraces.map(
        (chartTrace) => chartTrace.name,
      );
    expect(traceNames).toEqual(
      expect.arrayContaining([
        "run.csv rejected",
        "run.csv included",
        "run.csv fit selected",
        "run.csv fit",
      ]),
    );
    expect(
      accDecDirectionAnalysisProfileChartData.accDecDirectionAnalysisProfileShapes[0],
    ).toMatchObject({
      type: "line",
      x0: 3,
      x1: 3,
    });
    expect(accDecDirectionAnalysisProfileChartData.globalMinSpeed).toBe(3);
    expect(accDecDirectionAnalysisProfileChartData.globalMaxSpeed).toBe(8);
    expect(accDecDirectionAnalysisProfileChartData.globalMaxMetricValue).toBe(5);
  });

  it("scales acc into force units and grows max metric value when in force-velocity mode", () => {
    const accDecDirectionAnalysisProfileChartData = buildAccDecDirectionAnalysisProfileChartData({
      accDecDirectionAnalysisProfiles: buildAccDecDirectionAnalysisProfilesForAcc(),
      colorMap: COLOR_MAP,
      accDecDirectionMultiplier: 1,
      analysisProfileConfig: FORCE_VELOCITY_ANALYSIS_PROFILE_CONFIG,
      chosenAnalysisPoints: [],
      beforeChosenAnalysisPointsCount: 0,
      afterChosenAnalysisPointsCount: 0,
    });
    const includedTrace =
      accDecDirectionAnalysisProfileChartData.accDecDirectionAnalysisProfileTraces.find(
        (chartTrace) => chartTrace.name === "run.csv included",
      );
    expect(includedTrace.y[0]).toBe(2 * 75);
    expect(accDecDirectionAnalysisProfileChartData.globalMaxMetricValue).toBe(5 * 75);
  });

  it("omits fit trace when zero_crossing_speed is null and keeps maxMetricValue from points", () => {
    const analysisResult = makeAnalysisResult();
    analysisResult.analysis.acc_profile_fit.zero_crossing_speed = null;
    const accDecDirectionAnalysisProfileChartData = buildAccDecDirectionAnalysisProfileChartData({
      accDecDirectionAnalysisProfiles: buildAccDecDirectionAnalysisProfilesForAcc(analysisResult),
      colorMap: COLOR_MAP,
      accDecDirectionMultiplier: 1,
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
      chosenAnalysisPoints: [],
      beforeChosenAnalysisPointsCount: 0,
      afterChosenAnalysisPointsCount: 0,
    });
    expect(
      accDecDirectionAnalysisProfileChartData.accDecDirectionAnalysisProfileTraces.some(
        (chartTrace) => chartTrace.name === "run.csv fit",
      ),
    ).toBe(false);
    expect(accDecDirectionAnalysisProfileChartData.globalMaxMetricValue).toBe(4);
  });

  it("adds around-chosen and user-chosen traces when chosen points supplied", () => {
    const accDecDirectionAnalysisProfileChartData = buildAccDecDirectionAnalysisProfileChartData({
      accDecDirectionAnalysisProfiles: buildAccDecDirectionAnalysisProfilesForAcc(),
      colorMap: COLOR_MAP,
      accDecDirectionMultiplier: 1,
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
      chosenAnalysisPoints: [{ fileName: "run.csv", timeSeriesIndex: 1 }],
      beforeChosenAnalysisPointsCount: 1,
      afterChosenAnalysisPointsCount: 1,
    });
    const traceNames =
      accDecDirectionAnalysisProfileChartData.accDecDirectionAnalysisProfileTraces.map(
        (chartTrace) => chartTrace.name,
      );
    expect(traceNames).toContain("run.csv around chosen");
    expect(traceNames).toContain("run.csv user chosen");
  });

  it("omits around-chosen trace when window collapses but still emits user-chosen trace", () => {
    const accDecDirectionAnalysisProfileChartData = buildAccDecDirectionAnalysisProfileChartData({
      accDecDirectionAnalysisProfiles: buildAccDecDirectionAnalysisProfilesForAcc(),
      colorMap: COLOR_MAP,
      accDecDirectionMultiplier: 1,
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
      chosenAnalysisPoints: [{ fileName: "run.csv", timeSeriesIndex: 1 }],
      beforeChosenAnalysisPointsCount: 0,
      afterChosenAnalysisPointsCount: 0,
    });
    const traceNames =
      accDecDirectionAnalysisProfileChartData.accDecDirectionAnalysisProfileTraces.map(
        (chartTrace) => chartTrace.name,
      );
    expect(traceNames).not.toContain("run.csv around chosen");
    expect(traceNames).toContain("run.csv user chosen");
  });

  it("skips user-chosen trace when chosen point timeSeriesIndex does not match any metric point", () => {
    const accDecDirectionAnalysisProfileChartData = buildAccDecDirectionAnalysisProfileChartData({
      accDecDirectionAnalysisProfiles: buildAccDecDirectionAnalysisProfilesForAcc(),
      colorMap: COLOR_MAP,
      accDecDirectionMultiplier: 1,
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
      chosenAnalysisPoints: [{ fileName: "run.csv", timeSeriesIndex: 99 }],
      beforeChosenAnalysisPointsCount: 0,
      afterChosenAnalysisPointsCount: 0,
    });
    const traceNames =
      accDecDirectionAnalysisProfileChartData.accDecDirectionAnalysisProfileTraces.map(
        (chartTrace) => chartTrace.name,
      );
    expect(traceNames).not.toContain("run.csv user chosen");
  });

  it("keeps the earlier included point as maxIncludedSpeed when later included point has lower speed", () => {
    const descendingIncludedAnalysisResult = makeAnalysisResult({
      time_series: {
        start_time: "00:00:00.0",
        relative_times: [0, 1, 2, 3],
        speeds: [2, 8, 4, 6],
        accs: [1, 2, 3, 4],
        acc_labels: [
          ["e", 1],
          ["i", 2],
          ["s", 1],
        ],
        dec_labels: [
          ["e", 2],
          ["i", 2],
        ],
        x: [],
        y: [],
      },
    });
    const accDecDirectionAnalysisProfileChartData = buildAccDecDirectionAnalysisProfileChartData({
      accDecDirectionAnalysisProfiles: buildAccDecDirectionAnalysisProfilesForAcc(
        descendingIncludedAnalysisResult,
      ),
      colorMap: COLOR_MAP,
      accDecDirectionMultiplier: 1,
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
      chosenAnalysisPoints: [],
      beforeChosenAnalysisPointsCount: 0,
      afterChosenAnalysisPointsCount: 0,
    });
    expect(accDecDirectionAnalysisProfileChartData.globalMaxSpeed).toBe(8);
  });

  it("skips both chosen traces when chosen point references a different file", () => {
    const accDecDirectionAnalysisProfileChartData = buildAccDecDirectionAnalysisProfileChartData({
      accDecDirectionAnalysisProfiles: buildAccDecDirectionAnalysisProfilesForAcc(),
      colorMap: COLOR_MAP,
      accDecDirectionMultiplier: 1,
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
      chosenAnalysisPoints: [{ fileName: "other.csv", timeSeriesIndex: 1 }],
      beforeChosenAnalysisPointsCount: 1,
      afterChosenAnalysisPointsCount: 1,
    });
    const traceNames =
      accDecDirectionAnalysisProfileChartData.accDecDirectionAnalysisProfileTraces.map(
        (chartTrace) => chartTrace.name,
      );
    expect(traceNames).not.toContain("run.csv around chosen");
    expect(traceNames).not.toContain("run.csv user chosen");
  });

  it.each([
    {
      caseName: "negative multiplier labels metric as Deceleration in hovertemplate",
      accDecDirectionMultiplier: -1,
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
      expectedHoverLabel: "Deceleration",
    },
    {
      caseName: "positive multiplier labels metric as Acceleration in hovertemplate",
      accDecDirectionMultiplier: 1,
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
      expectedHoverLabel: "Acceleration",
    },
    {
      caseName: "force-velocity mode labels metric as Force regardless of multiplier sign",
      accDecDirectionMultiplier: -1,
      analysisProfileConfig: FORCE_VELOCITY_ANALYSIS_PROFILE_CONFIG,
      expectedHoverLabel: "Force",
    },
  ])("$caseName", ({ accDecDirectionMultiplier, analysisProfileConfig, expectedHoverLabel }) => {
    const accDecDirectionAnalysisProfileChartData = buildAccDecDirectionAnalysisProfileChartData({
      accDecDirectionAnalysisProfiles: buildAccDecDirectionAnalysisProfilesForAcc(),
      colorMap: COLOR_MAP,
      accDecDirectionMultiplier,
      analysisProfileConfig,
      chosenAnalysisPoints: [],
      beforeChosenAnalysisPointsCount: 0,
      afterChosenAnalysisPointsCount: 0,
    });
    const includedTrace =
      accDecDirectionAnalysisProfileChartData.accDecDirectionAnalysisProfileTraces.find(
        (chartTrace) => chartTrace.name === "run.csv included",
      );
    expect(includedTrace.hovertemplate).toContain(expectedHoverLabel);
  });
});

describe("getChosenAnalysisPointsFromPlotlyEvent", () => {
  it.each([
    { caseName: "returns [] when the event is null", plotlySelectionEvent: null },
    {
      caseName: "returns [] when the event has no points",
      plotlySelectionEvent: { points: [] },
    },
    {
      caseName: "filters points whose customdata is not an array",
      plotlySelectionEvent: { points: [{ customdata: null }, { customdata: undefined }] },
    },
  ])("$caseName", ({ plotlySelectionEvent }) => {
    expect(getChosenAnalysisPointsFromPlotlyEvent(plotlySelectionEvent)).toEqual([]);
  });

  it("maps plotly customdata tuple positions onto chosen analysis point fields", () => {
    expect(
      getChosenAnalysisPointsFromPlotlyEvent({
        points: [{ customdata: ["run.csv", 3, 1.5, 3601.5, 4.2, 2.5, "included"] }],
      }),
    ).toEqual([
      {
        fileName: "run.csv",
        timeSeriesIndex: 3,
        relativeTime: 1.5,
        absoluteTime: 3601.5,
        speed: 4.2,
        metricValue: 2.5,
        traceNameSuffix: "included",
      },
    ]);
  });
});

describe("buildAccDecDirectionAnalysisProfileChartLayout", () => {
  it("builds title, axis ranges and appends a y=0 baseline shape after supplied shapes", () => {
    const accDecDirectionAnalysisProfileChartLayout =
      buildAccDecDirectionAnalysisProfileChartLayout({
        accDecDirectionAnalysisProfileChartTitle: "AccProfile",
        accDecDirectionAnalysisProfileChartYAxisTitle: "Acc (m/s²)",
        globalMinSpeed: 3,
        globalMaxSpeed: 10,
        globalMaxMetricValue: 5,
        accDecDirectionAnalysisProfileShapes: [{ x0: 1 }],
      });
    expect(accDecDirectionAnalysisProfileChartLayout.title).toEqual({
      text: "AccProfile",
      font: { color: "#111111" },
    });
    expect(accDecDirectionAnalysisProfileChartLayout.uirevision).toBe("AccProfile");
    expect(accDecDirectionAnalysisProfileChartLayout.xaxis.range).toEqual([3, 10]);
    expect(accDecDirectionAnalysisProfileChartLayout.yaxis.range).toEqual([0, 5]);
    expect(accDecDirectionAnalysisProfileChartLayout.shapes).toHaveLength(2);
    expect(accDecDirectionAnalysisProfileChartLayout.shapes[1]).toMatchObject({
      type: "line",
      y0: 0,
      y1: 0,
      xref: "paper",
      yref: "y",
    });
    expect(accDecDirectionAnalysisProfileChartLayout.legend).toEqual({
      orientation: "h",
      x: 0,
      y: -0.22,
      xanchor: "left",
      yanchor: "top",
    });
  });

  it("clamps y-axis upper bound to 0 when maxMetricValue is negative", () => {
    const accDecDirectionAnalysisProfileChartLayout =
      buildAccDecDirectionAnalysisProfileChartLayout({
        accDecDirectionAnalysisProfileChartTitle: "T",
        accDecDirectionAnalysisProfileChartYAxisTitle: "Y",
        globalMinSpeed: 0,
        globalMaxSpeed: 5,
        globalMaxMetricValue: -3,
        accDecDirectionAnalysisProfileShapes: [],
      });
    expect(accDecDirectionAnalysisProfileChartLayout.yaxis.range).toEqual([0, 0]);
  });
});

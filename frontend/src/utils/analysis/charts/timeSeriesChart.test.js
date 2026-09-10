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
  buildCombinedTimeSeries,
  buildSpeedReferenceLines,
  buildTimeSeriesChartData,
  buildTimeSeriesChartLayout,
  buildTimeSeriesXAxisTickConfig,
} from "./timeSeriesChart";

const ACC_DEC_ANALYSIS_PROFILE_CONFIG = getAnalysisProfileConfig("accDecSpeedAnalysisProfile");
const FORCE_VELOCITY_ANALYSIS_PROFILE_CONFIG = getAnalysisProfileConfig(
  "forceVelocityAnalysisProfile",
);

const NEVER_HIDDEN = () => false;
const COLOR_MAP = { "a.csv": "#ff0000" };

function makeAnalysisResult(analysisOverrides = {}) {
  return {
    file_name: "a.csv",
    analysis: makeAnalysis({
      time_series: {
        start_time: "00:00:00.0",
        relative_times: [0, 1, 2],
        speeds: [1, 2, 3],
        accs: [0.5, 1, 1.5],
        acc_labels: [],
        dec_labels: [],
        x: [],
        y: [],
      },
      ...analysisOverrides,
    }),
  };
}

function makeMetricTimeSeries(overrides = {}) {
  return {
    name: "a.csv",
    x: [0, 1, 2, 3, 4],
    values: [10, 20, 30, 40, 50],
    labels: ["a", "b", "c", "d", "e"],
    color: "#ff0000",
    ...overrides,
  };
}

const identityFormatter = (value) => String(value);
const timeSeriesChartValueLabelFormatter = (yValue) => `${yValue}`;

describe("buildCombinedTimeSeries", () => {
  it("emits speed and acc chart series per visible analysis result", () => {
    const combinedTimeSeries = buildCombinedTimeSeries({
      visibleAnalysisResults: [makeAnalysisResult()],
      colorMap: COLOR_MAP,
      timeMode: "relative",
      speedMultiplier: 1,
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
    });
    expect(combinedTimeSeries.speedChartSeries).toHaveLength(1);
    expect(combinedTimeSeries.accChartSeries).toHaveLength(1);
    expect(combinedTimeSeries.speedChartSeries[0]).toMatchObject({
      name: "a.csv",
      values: [1, 2, 3],
      color: "#ff0000",
      x: [0, 1, 2],
      labels: [],
    });
    expect(combinedTimeSeries.accChartSeries[0].values).toEqual([0.5, 1, 1.5]);
  });

  it("scales speed values by speedMultiplier", () => {
    const combinedTimeSeries = buildCombinedTimeSeries({
      visibleAnalysisResults: [makeAnalysisResult()],
      colorMap: COLOR_MAP,
      timeMode: "relative",
      speedMultiplier: 3.6,
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
    });
    expect(combinedTimeSeries.speedChartSeries[0].values).toEqual([3.6, 7.2, 10.8]);
  });

  it("scales acc values by body mass when in force-velocity mode", () => {
    const combinedTimeSeries = buildCombinedTimeSeries({
      visibleAnalysisResults: [makeAnalysisResult()],
      colorMap: COLOR_MAP,
      timeMode: "relative",
      speedMultiplier: 1,
      analysisProfileConfig: FORCE_VELOCITY_ANALYSIS_PROFILE_CONFIG,
    });
    expect(combinedTimeSeries.accChartSeries[0].values).toEqual([0.5 * 75, 1 * 75, 1.5 * 75]);
  });

  it("produces absolute time labels when timeMode is absolute", () => {
    const combinedTimeSeries = buildCombinedTimeSeries({
      visibleAnalysisResults: [
        makeAnalysisResult({
          time_series: {
            start_time: "01:00:00.0",
            relative_times: [0, 1],
            speeds: [1, 2],
            accs: [0.5, 1],
            acc_labels: [],
            dec_labels: [],
            x: [],
            y: [],
          },
        }),
      ],
      colorMap: COLOR_MAP,
      timeMode: "absolute",
      speedMultiplier: 1,
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
    });
    expect(combinedTimeSeries.speedChartSeries[0].labels).toEqual([3600, 3601]);
  });
});

describe("buildSpeedReferenceLines", () => {
  it.each([
    {
      caseName: "collapses acc/dec speeds when equal into a single line",
      minAccSpeed: 3,
      minDecSpeed: 3,
      isAccDecDirectionHidden: NEVER_HIDDEN,
      speedMultiplier: 1,
      expectedYValues: [3],
    },
    {
      caseName: "emits separate lines when acc/dec min speeds differ",
      minAccSpeed: 3,
      minDecSpeed: 5,
      isAccDecDirectionHidden: NEVER_HIDDEN,
      speedMultiplier: 1,
      expectedYValues: [3, 5],
    },
    {
      caseName: "scales y values by speedMultiplier",
      minAccSpeed: 3,
      minDecSpeed: 3,
      isAccDecDirectionHidden: NEVER_HIDDEN,
      speedMultiplier: 3.6,
      expectedYValues: [10.8],
    },
    {
      caseName: "omits directions marked hidden",
      minAccSpeed: 3,
      minDecSpeed: 5,
      isAccDecDirectionHidden: () => true,
      speedMultiplier: 1,
      expectedYValues: [],
    },
  ])(
    "$caseName",
    ({ minAccSpeed, minDecSpeed, isAccDecDirectionHidden, speedMultiplier, expectedYValues }) => {
      const analysisResult = makeAnalysisResult();
      analysisResult.analysis.meta.min_acc_speed_m_per_s = minAccSpeed;
      analysisResult.analysis.meta.min_dec_speed_m_per_s = minDecSpeed;
      const speedReferenceLines = buildSpeedReferenceLines({
        visibleAnalysisResults: [analysisResult],
        colorMap: COLOR_MAP,
        isAccDecDirectionHidden,
        speedMultiplier,
      });
      expect(speedReferenceLines.map((referenceLine) => referenceLine.y).sort()).toEqual(
        expectedYValues,
      );
      speedReferenceLines.forEach((referenceLine) => {
        expect(referenceLine).toMatchObject({ color: "#ff0000", width: 1.5, dash: "dash" });
      });
    },
  );
});

describe("buildTimeSeriesChartData", () => {
  it("returns null when metricTimeSeriesList is empty", () => {
    expect(
      buildTimeSeriesChartData({
        metricTimeSeriesList: [],
        chosenAnalysisPoints: [],
        beforeChosenAnalysisPointsCount: 0,
        afterChosenAnalysisPointsCount: 0,
        timeSeriesChartSpeedReferenceLines: [],
        formatTimeSeriesChartXHoverLabel: identityFormatter,
        timeSeriesChartValueLabelFormatter,
      }),
    ).toBeNull();
  });

  it("emits a base scattergl line trace per metric time series", () => {
    const timeSeriesChartData = buildTimeSeriesChartData({
      metricTimeSeriesList: [makeMetricTimeSeries()],
      chosenAnalysisPoints: [],
      beforeChosenAnalysisPointsCount: 0,
      afterChosenAnalysisPointsCount: 0,
      timeSeriesChartSpeedReferenceLines: [],
      formatTimeSeriesChartXHoverLabel: identityFormatter,
      timeSeriesChartValueLabelFormatter,
    });
    expect(timeSeriesChartData.traces).toHaveLength(1);
    expect(timeSeriesChartData.traces[0]).toMatchObject({
      name: "a.csv",
      type: "scattergl",
      mode: "lines",
      x: [0, 1, 2, 3, 4],
      y: [10, 20, 30, 40, 50],
    });
    expect(timeSeriesChartData.traces[0].customdata).toHaveLength(5);
  });

  it("adds around-chosen line+markers trace and selected marker trace with vertical shape", () => {
    const timeSeriesChartData = buildTimeSeriesChartData({
      metricTimeSeriesList: [makeMetricTimeSeries()],
      chosenAnalysisPoints: [{ fileName: "a.csv", timeSeriesIndex: 2 }],
      beforeChosenAnalysisPointsCount: 1,
      afterChosenAnalysisPointsCount: 1,
      timeSeriesChartSpeedReferenceLines: [],
      formatTimeSeriesChartXHoverLabel: identityFormatter,
      timeSeriesChartValueLabelFormatter,
    });
    expect(timeSeriesChartData.shapes).toHaveLength(1);
    expect(timeSeriesChartData.shapes[0]).toMatchObject({
      type: "line",
      x0: 2,
      x1: 2,
      y0: 0,
      y1: 1,
    });
    const traceNames = timeSeriesChartData.traces.map((trace) => trace.name);
    expect(traceNames).toContain("a.csv around chosen");
    expect(traceNames).toContain("a.csv selected");
  });

  it("omits around-chosen trace when window collapses to a single point", () => {
    const timeSeriesChartData = buildTimeSeriesChartData({
      metricTimeSeriesList: [makeMetricTimeSeries()],
      chosenAnalysisPoints: [{ fileName: "a.csv", timeSeriesIndex: 2 }],
      beforeChosenAnalysisPointsCount: 0,
      afterChosenAnalysisPointsCount: 0,
      timeSeriesChartSpeedReferenceLines: [],
      formatTimeSeriesChartXHoverLabel: identityFormatter,
      timeSeriesChartValueLabelFormatter,
    });
    const traceNames = timeSeriesChartData.traces.map((trace) => trace.name);
    expect(traceNames).not.toContain("a.csv around chosen");
    expect(traceNames).toContain("a.csv selected");
  });

  it("skips chosen-point processing for series with no matching chosen points", () => {
    const timeSeriesChartData = buildTimeSeriesChartData({
      metricTimeSeriesList: [makeMetricTimeSeries({ name: "other.csv" })],
      chosenAnalysisPoints: [{ fileName: "a.csv", timeSeriesIndex: 2 }],
      beforeChosenAnalysisPointsCount: 1,
      afterChosenAnalysisPointsCount: 1,
      timeSeriesChartSpeedReferenceLines: [],
      formatTimeSeriesChartXHoverLabel: identityFormatter,
      timeSeriesChartValueLabelFormatter,
    });
    expect(timeSeriesChartData.traces).toHaveLength(1);
    expect(timeSeriesChartData.shapes).toEqual([]);
  });

  it("appends y-reference-line shapes", () => {
    const timeSeriesChartData = buildTimeSeriesChartData({
      metricTimeSeriesList: [makeMetricTimeSeries()],
      chosenAnalysisPoints: [],
      beforeChosenAnalysisPointsCount: 0,
      afterChosenAnalysisPointsCount: 0,
      timeSeriesChartSpeedReferenceLines: [{ y: 5, color: "#000000", width: 1, dash: "dash" }],
      formatTimeSeriesChartXHoverLabel: identityFormatter,
      timeSeriesChartValueLabelFormatter,
    });
    expect(timeSeriesChartData.shapes).toHaveLength(1);
    expect(timeSeriesChartData.shapes[0]).toMatchObject({
      type: "line",
      xref: "paper",
      yref: "y",
      y0: 5,
      y1: 5,
    });
  });

  it("returns the longest metric time series x/labels as reference", () => {
    const shortMetricTimeSeries = makeMetricTimeSeries({
      name: "short",
      x: [0, 1],
      values: [1, 2],
      labels: ["a", "b"],
    });
    const longMetricTimeSeries = makeMetricTimeSeries({ name: "long" });
    const timeSeriesChartData = buildTimeSeriesChartData({
      metricTimeSeriesList: [shortMetricTimeSeries, longMetricTimeSeries],
      chosenAnalysisPoints: [],
      beforeChosenAnalysisPointsCount: 0,
      afterChosenAnalysisPointsCount: 0,
      timeSeriesChartSpeedReferenceLines: [],
      formatTimeSeriesChartXHoverLabel: identityFormatter,
      timeSeriesChartValueLabelFormatter,
    });
    expect(timeSeriesChartData.referenceX).toEqual(longMetricTimeSeries.x);
    expect(timeSeriesChartData.referenceLabels).toEqual(longMetricTimeSeries.labels);
  });

  it("keeps the first metric time series as reference when subsequent series are shorter", () => {
    const longMetricTimeSeries = makeMetricTimeSeries({ name: "long" });
    const shortMetricTimeSeries = makeMetricTimeSeries({
      name: "short",
      x: [0, 1],
      values: [1, 2],
      labels: ["a", "b"],
    });
    const timeSeriesChartData = buildTimeSeriesChartData({
      metricTimeSeriesList: [longMetricTimeSeries, shortMetricTimeSeries],
      chosenAnalysisPoints: [],
      beforeChosenAnalysisPointsCount: 0,
      afterChosenAnalysisPointsCount: 0,
      timeSeriesChartSpeedReferenceLines: [],
      formatTimeSeriesChartXHoverLabel: identityFormatter,
      timeSeriesChartValueLabelFormatter,
    });
    expect(timeSeriesChartData.referenceX).toEqual(longMetricTimeSeries.x);
    expect(timeSeriesChartData.referenceLabels).toEqual(longMetricTimeSeries.labels);
  });
});

describe("buildTimeSeriesXAxisTickConfig", () => {
  it("caps ticks at 10 for long reference x", () => {
    const referenceXValues = Array.from({ length: 30 }, (_, referenceIndex) => referenceIndex);
    const timeSeriesXAxisTickConfig = buildTimeSeriesXAxisTickConfig(
      referenceXValues,
      referenceXValues.map(String),
      identityFormatter,
    );
    expect(timeSeriesXAxisTickConfig.tickmode).toBe("array");
    expect(timeSeriesXAxisTickConfig.tickvals.length).toBeLessThanOrEqual(10);
  });

  it("filters candidates to the visible x range when supplied", () => {
    const referenceXValues = [0, 1, 2, 3, 4, 5];
    const timeSeriesXAxisTickConfig = buildTimeSeriesXAxisTickConfig(
      referenceXValues,
      referenceXValues.map(String),
      identityFormatter,
      2,
      4,
    );
    expect(
      timeSeriesXAxisTickConfig.tickvals.every((tickValue) => tickValue >= 2 && tickValue <= 4),
    ).toBe(true);
  });

  it("falls back to all reference x when range excludes every candidate", () => {
    const timeSeriesXAxisTickConfig = buildTimeSeriesXAxisTickConfig(
      [0, 1, 2],
      ["a", "b", "c"],
      identityFormatter,
      100,
      200,
    );
    expect(timeSeriesXAxisTickConfig.tickvals).toEqual([0, 1, 2]);
  });

  it("deduplicates identical tick indices when the sample count is small", () => {
    const timeSeriesXAxisTickConfig = buildTimeSeriesXAxisTickConfig(
      [0, 1],
      ["a", "b"],
      identityFormatter,
    );
    expect(new Set(timeSeriesXAxisTickConfig.tickvals).size).toBe(
      timeSeriesXAxisTickConfig.tickvals.length,
    );
  });

  it("emits ticktext by running the tick formatter with matching label", () => {
    const timeSeriesXAxisTickConfig = buildTimeSeriesXAxisTickConfig(
      [0, 1],
      ["alpha", "beta"],
      (referenceXValue, referenceLabel) => `${referenceXValue}|${referenceLabel}`,
    );
    expect(timeSeriesXAxisTickConfig.ticktext).toEqual(["0|alpha", "1|beta"]);
  });
});

describe("buildTimeSeriesChartLayout", () => {
  it("builds layout with x rangemode tozero and merges tick config into xaxis", () => {
    const timeSeriesChartLayout = buildTimeSeriesChartLayout({
      timeSeriesChartTitle: "Speed",
      timeSeriesChartXAxisTitle: "t",
      timeSeriesChartYAxisTitle: "v",
      shouldIncludeZeroOnTimeSeriesChartXAxis: true,
      timeSeriesLayoutShapes: [{ x: 1 }],
      timeSeriesXAxisTickConfig: { tickmode: "array", tickvals: [1, 2], ticktext: ["a", "b"] },
    });
    expect(timeSeriesChartLayout.title).toEqual({ text: "Speed", font: { color: "#111111" } });
    expect(timeSeriesChartLayout.uirevision).toBe("Speed");
    expect(timeSeriesChartLayout.xaxis).toMatchObject({
      title: { text: "t", font: { color: "#111111" } },
      rangemode: "tozero",
      tickmode: "array",
      tickvals: [1, 2],
      ticktext: ["a", "b"],
    });
    expect(timeSeriesChartLayout.yaxis).toMatchObject({
      title: { text: "v", font: { color: "#111111" } },
    });
    expect(timeSeriesChartLayout.shapes).toEqual([{ x: 1 }]);
    expect(timeSeriesChartLayout.legend).toEqual({
      orientation: "h",
      x: 0,
      y: -0.22,
      xanchor: "left",
      yanchor: "top",
    });
  });

  it("leaves xaxis rangemode undefined when shouldIncludeZeroOnTimeSeriesChartXAxis is false", () => {
    const timeSeriesChartLayout = buildTimeSeriesChartLayout({
      timeSeriesChartTitle: "T",
      timeSeriesChartXAxisTitle: "x",
      timeSeriesChartYAxisTitle: "y",
      shouldIncludeZeroOnTimeSeriesChartXAxis: false,
      timeSeriesLayoutShapes: [],
      timeSeriesXAxisTickConfig: null,
    });
    expect(timeSeriesChartLayout.xaxis.rangemode).toBeUndefined();
  });
});

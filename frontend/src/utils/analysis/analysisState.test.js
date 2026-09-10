import { describe, it, expect } from "vitest";

import { makeAnalysis, makeResult } from "../../../test/testUtils";

import { buildAnalysisViewModel } from "./analysisState";

function analysisResultFromFixture(fileName, analysisOverrides = {}) {
  return makeResult(fileName, analysisOverrides);
}

const DEFAULT_ANALYSIS_VIEW_OPTIONS = {
  analysisProfileMode: "accDecSpeedAnalysisProfile",
  timeSeriesSpeedUnit: "m/s",
  timeMode: "relative",
  statsActivityScopeMode: "all",
  pitchZoneMode: "full",
  eventActivityScopeMode: "all",
  binMode: "classic",
  binMetric: "force",
  distributionYAxisScale: "linear",
};

const HIDE_NONE = () => false;

describe("buildAnalysisViewModel", () => {
  it("returns all visible when nothing is hidden and reports the full count", () => {
    const analysisResults = [
      analysisResultFromFixture("a.csv"),
      analysisResultFromFixture("b.csv"),
    ];
    const analysisViewModel = buildAnalysisViewModel(
      analysisResults,
      HIDE_NONE,
      { "a.csv": "#ff0000", "b.csv": "#00ff00" },
      DEFAULT_ANALYSIS_VIEW_OPTIONS,
    );
    expect(
      analysisViewModel.visibleAnalysisResults.map(
        (visibleAnalysisResult) => visibleAnalysisResult.file_name,
      ),
    ).toEqual(["a.csv", "b.csv"]);
    expect(analysisViewModel.visibleAccDecDirectionAnalysisProfilesCount).toBe(4);
    expect(analysisViewModel.areAllAccDecDirectionAnalysisProfilesShown).toBe(true);
  });

  it("areAllAccDecDirectionAnalysisProfilesShown is false and count is 0 for empty results", () => {
    const analysisViewModel = buildAnalysisViewModel(
      [],
      HIDE_NONE,
      {},
      DEFAULT_ANALYSIS_VIEW_OPTIONS,
    );
    expect(analysisViewModel.visibleAnalysisResults).toEqual([]);
    expect(analysisViewModel.visibleAccDecDirectionAnalysisProfilesCount).toBe(0);
    expect(analysisViewModel.areAllAccDecDirectionAnalysisProfilesShown).toBe(false);
  });

  it("filters out results whose acc and dec are both hidden", () => {
    const analysisResults = [
      analysisResultFromFixture("a.csv"),
      analysisResultFromFixture("b.csv"),
    ];
    const analysisViewModel = buildAnalysisViewModel(
      analysisResults,
      (fileName) => fileName === "b.csv",
      { "a.csv": "#ff0000", "b.csv": "#00ff00" },
      DEFAULT_ANALYSIS_VIEW_OPTIONS,
    );
    expect(analysisViewModel.visibleAnalysisResults).toHaveLength(1);
    expect(analysisViewModel.visibleAnalysisResults[0].file_name).toBe("a.csv");
    expect(analysisViewModel.areAllAccDecDirectionAnalysisProfilesShown).toBe(false);
    expect(analysisViewModel.visibleAccDecDirectionAnalysisProfilesCount).toBe(2);
  });

  it("keeps a result visible when only one direction is hidden and drops that metric from stats", () => {
    const analysisResults = [analysisResultFromFixture("a.csv")];
    const analysisViewModel = buildAnalysisViewModel(
      analysisResults,
      (fileName, accDecDirection) => fileName === "a.csv" && accDecDirection === "acc",
      { "a.csv": "#ff0000" },
      DEFAULT_ANALYSIS_VIEW_OPTIONS,
    );
    expect(analysisViewModel.visibleAnalysisResults).toHaveLength(1);
    expect(analysisViewModel.areAllAccDecDirectionAnalysisProfilesShown).toBe(false);
    expect(analysisViewModel.visibleAccDecDirectionAnalysisProfilesCount).toBe(1);
    const tableMetricKeys = analysisViewModel.filteredSampleStatsTableRows.map(
      (filteredSampleStatsTableRow) => filteredSampleStatsTableRow.tableMetricKey,
    );
    expect(tableMetricKeys).toContain("speed");
    expect(tableMetricKeys).toContain("dec");
    expect(tableMetricKeys).not.toContain("acc");
  });

  it.each([
    ["relative", false],
    ["absolute", true],
  ])(
    "canUseAbsoluteTimeAxis is %p when timeMode is %p and results are non-empty",
    (timeMode, expectedCanUseAbsoluteTimeAxis) => {
      const analysisResults = [analysisResultFromFixture("a.csv")];
      const analysisViewModel = buildAnalysisViewModel(
        analysisResults,
        HIDE_NONE,
        { "a.csv": "#ff0000" },
        { ...DEFAULT_ANALYSIS_VIEW_OPTIONS, timeMode },
      );
      expect(analysisViewModel.canUseAbsoluteTimeAxis).toBe(expectedCanUseAbsoluteTimeAxis);
    },
  );

  it("canUseAbsoluteTimeAxis is false for absolute timeMode when there are no visible results", () => {
    const analysisViewModel = buildAnalysisViewModel(
      [],
      HIDE_NONE,
      {},
      { ...DEFAULT_ANALYSIS_VIEW_OPTIONS, timeMode: "absolute" },
    );
    expect(analysisViewModel.canUseAbsoluteTimeAxis).toBe(false);
  });

  it("force-velocity mode renames combined stats metrics to force keys", () => {
    const analysisResults = [analysisResultFromFixture("a.csv")];
    const analysisViewModel = buildAnalysisViewModel(
      analysisResults,
      HIDE_NONE,
      { "a.csv": "#ff0000" },
      { ...DEFAULT_ANALYSIS_VIEW_OPTIONS, analysisProfileMode: "forceVelocityAnalysisProfile" },
    );
    const tableMetricKeys = analysisViewModel.filteredSampleStatsTableRows.map(
      (filteredSampleStatsTableRow) => filteredSampleStatsTableRow.tableMetricKey,
    );
    expect(tableMetricKeys).toEqual(["speed", "accForce", "decForce"]);
  });

  it.each([
    ["m/s", 1],
    ["km/h", 3.6],
  ])(
    "combinedTimeSeries speed values are multiplied by %p when timeSeriesSpeedUnit is %p",
    (timeSeriesSpeedUnit, expectedSpeedMultiplier) => {
      const analysisResults = [
        {
          file_name: "a.csv",
          analysis: makeAnalysis({
            time_series: {
              start_time: "00:00:00.0",
              relative_times: [0, 0.5, 1.0],
              speeds: [1, 2, 3],
              accs: [0.5, 1.0, 1.5],
              acc_labels: [["e", 3]],
              dec_labels: [["e", 3]],
              x: [0, 1, 2],
              y: [0, 1, 2],
            },
          }),
        },
      ];
      const analysisViewModel = buildAnalysisViewModel(
        analysisResults,
        HIDE_NONE,
        { "a.csv": "#ff0000" },
        { ...DEFAULT_ANALYSIS_VIEW_OPTIONS, timeSeriesSpeedUnit },
      );
      const [speedChartSeries] = analysisViewModel.combinedTimeSeries.speedChartSeries;
      expect(speedChartSeries.values).toEqual([
        1 * expectedSpeedMultiplier,
        2 * expectedSpeedMultiplier,
        3 * expectedSpeedMultiplier,
      ]);
    },
  );

  it("force-velocity mode scales acc series in combined time series by body mass", () => {
    const analysisResults = [
      {
        file_name: "a.csv",
        analysis: makeAnalysis({
          meta: { body_mass_kg: 80 },
          time_series: {
            start_time: "00:00:00.0",
            relative_times: [0, 1],
            speeds: [1, 2],
            accs: [1, 2],
            acc_labels: [["e", 2]],
            dec_labels: [["e", 2]],
            x: [0, 1],
            y: [0, 1],
          },
        }),
      },
    ];
    const analysisViewModel = buildAnalysisViewModel(
      analysisResults,
      HIDE_NONE,
      { "a.csv": "#ff0000" },
      { ...DEFAULT_ANALYSIS_VIEW_OPTIONS, analysisProfileMode: "forceVelocityAnalysisProfile" },
    );
    const [accChartSeries] = analysisViewModel.combinedTimeSeries.accChartSeries;
    expect(accChartSeries.values).toEqual([80, 160]);
  });

  it("speedReferenceLines emits one line per visible direction using meta min speeds", () => {
    const analysisResults = [
      {
        file_name: "a.csv",
        analysis: makeAnalysis({
          meta: { min_acc_speed_m_per_s: 4, min_dec_speed_m_per_s: 5 },
        }),
      },
    ];
    const analysisViewModel = buildAnalysisViewModel(
      analysisResults,
      HIDE_NONE,
      { "a.csv": "#ff0000" },
      DEFAULT_ANALYSIS_VIEW_OPTIONS,
    );
    const yReferenceValues = analysisViewModel.speedReferenceLines
      .map((speedReferenceLine) => speedReferenceLine.y)
      .sort();
    expect(yReferenceValues).toEqual([4, 5]);
  });

  it("accDecDirectionAnalysisProfiles are keyed by direction and include both when nothing is hidden", () => {
    const analysisResults = [analysisResultFromFixture("a.csv")];
    const analysisViewModel = buildAnalysisViewModel(
      analysisResults,
      HIDE_NONE,
      { "a.csv": "#ff0000" },
      DEFAULT_ANALYSIS_VIEW_OPTIONS,
    );
    expect(Object.keys(analysisViewModel.accDecDirectionAnalysisProfiles).sort()).toEqual([
      "acc",
      "dec",
    ]);
    expect(analysisViewModel.accDecDirectionAnalysisProfiles.acc).toHaveLength(1);
    expect(analysisViewModel.accDecDirectionAnalysisProfiles.dec).toHaveLength(1);
  });

  it("eventRows are keyed by direction", () => {
    const analysisResults = [analysisResultFromFixture("a.csv")];
    const analysisViewModel = buildAnalysisViewModel(
      analysisResults,
      HIDE_NONE,
      { "a.csv": "#ff0000" },
      DEFAULT_ANALYSIS_VIEW_OPTIONS,
    );
    expect(Object.keys(analysisViewModel.eventRows).sort()).toEqual(["acc", "dec"]);
  });

  it("speedDistributionChart is built from sample_distributions and returns null when empty", () => {
    const emptyDistributionAnalysisResults = [
      analysisResultFromFixture("a.csv", {
        sample_distributions: {
          full: { all: [], high_speed_running: [] },
          left: { all: [], high_speed_running: [] },
          middle: { all: [], high_speed_running: [] },
          right: { all: [], high_speed_running: [] },
        },
      }),
    ];
    const emptyDistributionAnalysisViewModel = buildAnalysisViewModel(
      emptyDistributionAnalysisResults,
      HIDE_NONE,
      { "a.csv": "#ff0000" },
      DEFAULT_ANALYSIS_VIEW_OPTIONS,
    );
    expect(emptyDistributionAnalysisViewModel.speedDistributionChart).toBeNull();

    const populatedAnalysisResults = [
      analysisResultFromFixture("a.csv", {
        sample_distributions: {
          full: { all: [1, 2, 3], high_speed_running: [] },
          left: { all: [], high_speed_running: [] },
          middle: { all: [], high_speed_running: [] },
          right: { all: [], high_speed_running: [] },
        },
      }),
    ];
    const populatedAnalysisViewModel = buildAnalysisViewModel(
      populatedAnalysisResults,
      HIDE_NONE,
      { "a.csv": "#ff0000" },
      DEFAULT_ANALYSIS_VIEW_OPTIONS,
    );
    expect(populatedAnalysisViewModel.speedDistributionChart).not.toBeNull();
    expect(populatedAnalysisViewModel.speedDistributionChart.distributionChartKey).toBe("speed");
  });

  it("eventDistributionCharts emits one chart entry per acc-dec direction keyed by direction", () => {
    const analysisResults = [analysisResultFromFixture("a.csv")];
    const analysisViewModel = buildAnalysisViewModel(
      analysisResults,
      HIDE_NONE,
      { "a.csv": "#ff0000" },
      DEFAULT_ANALYSIS_VIEW_OPTIONS,
    );
    expect(Object.keys(analysisViewModel.eventDistributionCharts).sort()).toEqual(["acc", "dec"]);
    expect(analysisViewModel.eventDistributionCharts.acc.distributionChartKey).toBe(
      "acc-events-classic",
    );
    expect(analysisViewModel.eventDistributionCharts.dec.distributionChartKey).toBe(
      "dec-events-classic",
    );
  });

  it.each([
    [{ binMode: "classic", binMetric: "acc" }, "Low", "Low (0-2.5)"],
    [{ binMode: "detailed", binMetric: "acc" }, "3-4", "3-4"],
    [{ binMode: "classic", binMetric: "acc" }, "All", "All"],
  ])(
    "formatEventBinLabel formats %j label %p as %p",
    (analysisViewOptionsOverrides, binLabel, expectedFormattedLabel) => {
      const analysisViewModel = buildAnalysisViewModel(
        [],
        HIDE_NONE,
        {},
        { ...DEFAULT_ANALYSIS_VIEW_OPTIONS, ...analysisViewOptionsOverrides },
      );
      expect(analysisViewModel.formatEventBinLabel(binLabel)).toBe(expectedFormattedLabel);
    },
  );
});

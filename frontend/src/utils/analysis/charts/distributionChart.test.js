import { describe, expect, it, vi } from "vitest";

vi.mock("../../shared/conversions", async () => {
  const actualConversions = await vi.importActual("../../shared/conversions");
  return {
    ...actualConversions,
    cssVar: () => "#111111",
  };
});

import { makeAnalysis, directionEvents, sampleDistributions } from "../../../../test/testUtils";

import {
  buildDistributionChartLayout,
  buildDistributionChartTraces,
  buildEventDistributionCharts,
  buildSpeedDistributionChart,
} from "./distributionChart";

const NEVER_HIDDEN = () => false;
const COLOR_MAP = { "a.csv": "#ff0000" };

function makeAnalysisResult(analysisOverrides = {}) {
  return {
    file_name: "a.csv",
    analysis: makeAnalysis({
      sample_distributions: sampleDistributions((pitchZone, activityScope) =>
        pitchZone === "full" && activityScope === "all" ? [5, 8] : [],
      ),
      acc_events: directionEvents(
        (pitchZone, activityScope, binMode, binMetric, binDef, binIndex) => {
          if (!binMode) return {};
          if (binMode === "detailed" && binDef && binDef.binLabel === ">=7") {
            return { count: 5, mean_peak_magnitude: 10.5 };
          }
          if (binMode === "detailed") return { count: 5 - (binIndex ?? 0) };
          return {};
        },
      ),
      ...analysisOverrides,
    }),
  };
}

describe("buildDistributionChartTraces", () => {
  it("applies overlay opacity and border while preserving supplied fields", () => {
    expect(
      buildDistributionChartTraces([
        { name: "hist", type: "histogram", x: [1, 2], marker: { color: "#ff0000" } },
      ]),
    ).toEqual([
      {
        name: "hist",
        type: "histogram",
        x: [1, 2],
        opacity: 0.3,
        marker: { color: "#ff0000", line: { width: 2, color: "#ff0000" } },
      },
    ]);
  });
});

describe("buildDistributionChartLayout", () => {
  it("builds overlay histogram layout with caller axes and horizontal legend", () => {
    expect(
      buildDistributionChartLayout({
        distributionChartTitle: "Speed",
        distributionChartXAxis: { title: { text: "m/s" } },
        distributionChartYAxis: { title: { text: "count" } },
      }),
    ).toEqual({
      title: { text: "Speed", font: { color: "#111111" } },
      font: { color: "#111111" },
      uirevision: "Speed",
      margin: { l: 50, r: 20, t: 40, b: 80 },
      showlegend: true,
      barmode: "overlay",
      bargap: 0,
      bargroupgap: 0,
      xaxis: { title: { text: "m/s" } },
      yaxis: { title: { text: "count" } },
      legend: { orientation: "h", x: 0, y: -0.22, xanchor: "left", yanchor: "top" },
    });
  });
});

describe("buildSpeedDistributionChart", () => {
  it("returns null when no visible analysis result has speed bins", () => {
    expect(
      buildSpeedDistributionChart({
        visibleAnalysisResults: [],
        colorMap: {},
        eventActivityScopeMode: "all",
        pitchZoneMode: "full",
        distributionYAxisScale: "log",
      }),
    ).toBeNull();
  });

  it("builds a bar trace per visible analysis result with log scale y-axis", () => {
    const speedDistributionChart = buildSpeedDistributionChart({
      visibleAnalysisResults: [makeAnalysisResult()],
      colorMap: COLOR_MAP,
      eventActivityScopeMode: "all",
      pitchZoneMode: "full",
      distributionYAxisScale: "log",
    });
    expect(speedDistributionChart.distributionChartKey).toBe("speed");
    expect(speedDistributionChart.distributionChartTitle).toBe("Speed Distribution");
    expect(speedDistributionChart.distributionChartTraces).toHaveLength(1);
    expect(speedDistributionChart.distributionChartTraces[0]).toMatchObject({
      type: "bar",
      name: "a.csv",
      x: [0.5, 1.5],
      y: [5, 8],
      width: 1,
      marker: { color: "#ff0000" },
      showlegend: true,
    });
    expect(speedDistributionChart.distributionChartXAxis).toEqual({
      title: { text: "m/s" },
      type: "linear",
      range: [0, 2],
      tick0: 0,
      dtick: 1,
    });
    expect(speedDistributionChart.distributionChartYAxis).toEqual({
      title: { text: "Count" },
      type: "log",
      rangemode: "tozero",
    });
  });

  it.each([
    {
      caseName: "high-speed running scope adds suffix to title",
      eventActivityScopeMode: "high_speed_running",
      pitchZoneMode: "full",
      matchingPitchZone: "full",
      matchingActivityScope: "high_speed_running",
      expectedTitleSuffix: " (High-speed running only)",
    },
    {
      caseName: "non-full pitch zone adds zone suffix to title",
      eventActivityScopeMode: "all",
      pitchZoneMode: "left",
      matchingPitchZone: "left",
      matchingActivityScope: "all",
      expectedTitleSuffix: " - left",
    },
    {
      caseName: "high-speed running combined with non-full zone appends both suffixes",
      eventActivityScopeMode: "high_speed_running",
      pitchZoneMode: "right",
      matchingPitchZone: "right",
      matchingActivityScope: "high_speed_running",
      expectedTitleSuffix: " (High-speed running only) - right",
    },
  ])(
    "$caseName",
    ({
      eventActivityScopeMode,
      pitchZoneMode,
      matchingPitchZone,
      matchingActivityScope,
      expectedTitleSuffix,
    }) => {
      const analysisResult = {
        file_name: "a.csv",
        analysis: makeAnalysis({
          sample_distributions: sampleDistributions((pitchZone, activityScope) =>
            pitchZone === matchingPitchZone && activityScope === matchingActivityScope ? [1] : [],
          ),
        }),
      };
      const speedDistributionChart = buildSpeedDistributionChart({
        visibleAnalysisResults: [analysisResult],
        colorMap: COLOR_MAP,
        eventActivityScopeMode,
        pitchZoneMode,
        distributionYAxisScale: "linear",
      });
      expect(speedDistributionChart.distributionChartTitle).toBe(
        `Speed Distribution${expectedTitleSuffix}`,
      );
    },
  );

  it("skips analysis results with empty speed bins but keeps others", () => {
    const emptyAnalysisResult = {
      file_name: "empty.csv",
      analysis: makeAnalysis({ sample_distributions: sampleDistributions(() => []) }),
    };
    const speedDistributionChart = buildSpeedDistributionChart({
      visibleAnalysisResults: [emptyAnalysisResult, makeAnalysisResult()],
      colorMap: COLOR_MAP,
      eventActivityScopeMode: "all",
      pitchZoneMode: "full",
      distributionYAxisScale: "linear",
    });
    expect(speedDistributionChart.distributionChartTraces).toHaveLength(1);
    expect(speedDistributionChart.distributionChartTraces[0].name).toBe("a.csv");
  });
});

describe("buildEventDistributionCharts", () => {
  it("emits an entry per acc/dec direction with correct labels and open-bin ceiling from peaks", () => {
    const eventDistributionCharts = buildEventDistributionCharts({
      visibleAnalysisResults: [makeAnalysisResult()],
      isAccDecDirectionHidden: NEVER_HIDDEN,
      eventActivityScopeMode: "all",
      pitchZoneMode: "full",
      binMode: "detailed",
      binMetric: "force",
      distributionYAxisScale: "linear",
      colorMap: COLOR_MAP,
    });
    expect(Object.keys(eventDistributionCharts).sort()).toEqual(["acc", "dec"]);
    expect(eventDistributionCharts.acc.distributionChartKey).toBe("acc-events-detailed");
    expect(eventDistributionCharts.acc.distributionChartTitle).toContain(
      "Acceleration Events by Bin",
    );
    expect(eventDistributionCharts.acc.distributionChartTraces).toHaveLength(1);
    expect(eventDistributionCharts.acc.distributionChartTraces[0].y).toEqual([5, 4, 3, 2, 1, 5]);
    expect(eventDistributionCharts.acc.distributionChartXAxis.title.text).toBe("Force (N)");
    const openBinCustomdata =
      eventDistributionCharts.acc.distributionChartTraces[0].customdata.at(-1)[0];
    expect(openBinCustomdata).toBe("Force: >=525 N");
    expect(eventDistributionCharts.acc.distributionChartXAxis.ticktext.at(-1)).toBe("600");
    expect(eventDistributionCharts.acc.distributionChartYAxis).toEqual({
      title: { text: "Event count" },
      type: "linear",
      rangemode: "tozero",
    });
  });

  it("acceleration metric labels x-axis in m/s^2", () => {
    const eventDistributionCharts = buildEventDistributionCharts({
      visibleAnalysisResults: [makeAnalysisResult()],
      isAccDecDirectionHidden: NEVER_HIDDEN,
      eventActivityScopeMode: "all",
      pitchZoneMode: "full",
      binMode: "detailed",
      binMetric: "acc",
      distributionYAxisScale: "linear",
      colorMap: COLOR_MAP,
    });
    expect(eventDistributionCharts.acc.distributionChartXAxis.title.text).toBe(
      "Acceleration (m/s²)",
    );
    expect(eventDistributionCharts.acc.distributionChartTraces[0].customdata[0][0]).toContain(
      "m/s²",
    );
  });

  it("filters visible analysis results whose direction is hidden", () => {
    const eventDistributionCharts = buildEventDistributionCharts({
      visibleAnalysisResults: [makeAnalysisResult()],
      isAccDecDirectionHidden: (fileName, accDecDirection) => accDecDirection === "acc",
      eventActivityScopeMode: "all",
      pitchZoneMode: "full",
      binMode: "detailed",
      binMetric: "force",
      distributionYAxisScale: "linear",
      colorMap: COLOR_MAP,
    });
    expect(eventDistributionCharts.acc.distributionChartTraces).toEqual([]);
    expect(eventDistributionCharts.dec.distributionChartTraces).toHaveLength(1);
  });

  it("uses last-bin lower bound + standard width when no peak magnitudes remain", () => {
    const eventDistributionCharts = buildEventDistributionCharts({
      visibleAnalysisResults: [],
      isAccDecDirectionHidden: NEVER_HIDDEN,
      eventActivityScopeMode: "all",
      pitchZoneMode: "full",
      binMode: "classic",
      binMetric: "acc",
      distributionYAxisScale: "linear",
      colorMap: COLOR_MAP,
    });
    expect(eventDistributionCharts.acc.distributionChartTraces).toEqual([]);
    expect(eventDistributionCharts.acc.distributionChartXAxis.ticktext.at(-1)).toBe("4.5");
  });
});

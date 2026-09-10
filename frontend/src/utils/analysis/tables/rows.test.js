import { describe, it, expect } from "vitest";

import { makeAnalysis } from "../../../../test/testUtils";
import { getAnalysisProfileConfig } from "../../analysis/constants";

import {
  buildAccDecDirectionAnalysisProfileTableRows,
  buildEventRowsForAccDecDirection,
  buildEventRows,
  buildFilteredSampleStatsTableRows,
  iterateEventRowsForAccDecDirection,
} from "./rows";

const ACC_DEC_ANALYSIS_PROFILE_CONFIG = getAnalysisProfileConfig("accDecSpeedAnalysisProfile");
const FORCE_VELOCITY_ANALYSIS_PROFILE_CONFIG = getAnalysisProfileConfig(
  "forceVelocityAnalysisProfile",
);

function makeAnalysisResult(fileName, analysisOverrides = {}) {
  return { file_name: fileName, analysis: makeAnalysis(analysisOverrides) };
}

describe("buildAccDecDirectionAnalysisProfileTableRows", () => {
  it("emits one row per (direction, file) in [acc, acc, dec, dec] order", () => {
    const analysisProfileTableRows = buildAccDecDirectionAnalysisProfileTableRows({
      analysisResults: [makeAnalysisResult("a.csv"), makeAnalysisResult("b.csv")],
      colorMap: { "a.csv": "#ff0000", "b.csv": "#00ff00" },
      isAccDecDirectionHidden: () => false,
    });
    expect(analysisProfileTableRows).toHaveLength(4);
    expect(analysisProfileTableRows.map((row) => row.accDecDirection)).toEqual([
      "acc",
      "acc",
      "dec",
      "dec",
    ]);
  });

  it("assigns direction-specific labels, multipliers, keys, and color", () => {
    const [firstAccRow, , firstDecRow] = buildAccDecDirectionAnalysisProfileTableRows({
      analysisResults: [makeAnalysisResult("a.csv"), makeAnalysisResult("b.csv")],
      colorMap: { "a.csv": "#112233" },
      isAccDecDirectionHidden: () => false,
    });
    expect(firstAccRow.key).toBe("a.csv-acc");
    expect(firstAccRow.accDecDirectionLabel).toBe("Acceleration");
    expect(firstAccRow.accDecDirectionMultiplier).toBe(1);
    expect(firstAccRow.color).toBe("#112233");
    expect(firstDecRow.accDecDirectionLabel).toBe("Deceleration");
    expect(firstDecRow.accDecDirectionMultiplier).toBe(-1);
  });

  it("marks isHidden per (fileName, direction) via predicate", () => {
    const analysisProfileTableRows = buildAccDecDirectionAnalysisProfileTableRows({
      analysisResults: [makeAnalysisResult("a.csv"), makeAnalysisResult("b.csv")],
      colorMap: {},
      isAccDecDirectionHidden: (fileName, accDecDirection) =>
        (fileName === "a.csv" && accDecDirection === "acc") || fileName === "b.csv",
    });
    const isHiddenByKey = Object.fromEntries(
      analysisProfileTableRows.map((row) => [row.key, row.isHidden]),
    );
    expect(isHiddenByKey).toEqual({
      "a.csv-acc": true,
      "a.csv-dec": false,
      "b.csv-acc": true,
      "b.csv-dec": true,
    });
  });

  it("propagates bodyMass and accDecDirection-specific profile fit", () => {
    const [firstAccRow, firstDecRow] = buildAccDecDirectionAnalysisProfileTableRows({
      analysisResults: [
        makeAnalysisResult("a.csv", {
          meta: { ...makeAnalysis().meta, body_mass_kg: 80 },
          acc_profile_fit: { intercept: 5, slope: -1, zero_crossing_speed: 5, r_squared: 0.9 },
          dec_profile_fit: null,
        }),
      ],
      colorMap: {},
      isAccDecDirectionHidden: () => false,
    });
    expect(firstAccRow.bodyMass).toBe(80);
    expect(firstAccRow.accDecDirectionAnalysisProfileFit).toEqual({
      intercept: 5,
      slope: -1,
      zero_crossing_speed: 5,
      r_squared: 0.9,
    });
    expect(firstDecRow.accDecDirectionAnalysisProfileFit).toBeNull();
  });
});

function makeAnalysisResultWithClassicForceBinCounts(fileName, binCounts) {
  const analysisTemplate = makeAnalysis();
  const buildDirectionEventsWithBinCounts = () => ({
    ...analysisTemplate.acc_events,
    full: {
      ...analysisTemplate.acc_events.full,
      all: {
        ...analysisTemplate.acc_events.full.all,
        stats: { ...analysisTemplate.acc_events.full.all.stats, count: 10, mean: 5 },
        bins: {
          ...analysisTemplate.acc_events.full.all.bins,
          classic: {
            ...analysisTemplate.acc_events.full.all.bins.classic,
            force: analysisTemplate.acc_events.full.all.bins.classic.force.map(
              (binStats, binIndex) => ({ ...binStats, count: binCounts[binIndex] ?? 0 }),
            ),
          },
        },
      },
    },
  });
  return makeAnalysisResult(fileName, {
    acc_events: buildDirectionEventsWithBinCounts(),
    dec_events: buildDirectionEventsWithBinCounts(),
  });
}

describe("buildEventRowsForAccDecDirection", () => {
  const baseArgs = {
    accDecDirection: "acc",
    isAccDecDirectionHidden: () => false,
    eventActivityScopeMode: "all",
    pitchZoneMode: "full",
    binMode: "classic",
    binMetric: "force",
  };

  it("prepends aggregate 'All' bin row from stats and includes non-zero bins", () => {
    const eventRows = buildEventRowsForAccDecDirection({
      ...baseArgs,
      visibleAnalysisResults: [makeAnalysisResultWithClassicForceBinCounts("a.csv", [3, 0, 0])],
    });
    expect(eventRows[0].binLabel).toBe("All");
    expect(eventRows[0].stats.count).toBe(10);
    const nonAllEventRows = eventRows.filter((eventRow) => eventRow.binLabel !== "All");
    expect(nonAllEventRows).toHaveLength(1);
    expect(nonAllEventRows[0].stats.count).toBe(3);
  });

  it("drops bins where every visible file has zero count", () => {
    const eventRows = buildEventRowsForAccDecDirection({
      ...baseArgs,
      visibleAnalysisResults: [makeAnalysisResultWithClassicForceBinCounts("a.csv", [0, 0, 0])],
    });
    expect(eventRows.filter((eventRow) => eventRow.binLabel !== "All")).toEqual([]);
  });

  it("skips files hidden for the direction", () => {
    const eventRows = buildEventRowsForAccDecDirection({
      ...baseArgs,
      visibleAnalysisResults: [
        makeAnalysisResultWithClassicForceBinCounts("a.csv", [3, 0, 0]),
        makeAnalysisResultWithClassicForceBinCounts("b.csv", [3, 0, 0]),
      ],
      isAccDecDirectionHidden: (fileName) => fileName === "b.csv",
    });
    expect(new Set(eventRows.map((eventRow) => eventRow.fileName))).toEqual(new Set(["a.csv"]));
  });

  it("keeps a bin when at least one visible file has non-zero count", () => {
    const eventRows = buildEventRowsForAccDecDirection({
      ...baseArgs,
      visibleAnalysisResults: [
        makeAnalysisResultWithClassicForceBinCounts("a.csv", [0, 0, 0]),
        makeAnalysisResultWithClassicForceBinCounts("b.csv", [2, 0, 0]),
      ],
    });
    const nonAllEventRows = eventRows.filter((eventRow) => eventRow.binLabel !== "All");
    expect(nonAllEventRows.map((eventRow) => eventRow.fileName).sort()).toEqual(["a.csv", "b.csv"]);
  });
});

describe("buildEventRows", () => {
  it("returns object keyed by 'acc' and 'dec' directions", () => {
    const eventRowsByDirection = buildEventRows({
      visibleAnalysisResults: [],
      isAccDecDirectionHidden: () => false,
      eventActivityScopeMode: "all",
      pitchZoneMode: "full",
      binMode: "classic",
      binMetric: "force",
    });
    expect(Object.keys(eventRowsByDirection).sort()).toEqual(["acc", "dec"]);
    expect(eventRowsByDirection.acc).toEqual([]);
    expect(eventRowsByDirection.dec).toEqual([]);
  });
});

describe("iterateEventRowsForAccDecDirection", () => {
  it("yields rows for every (scope, zone, binMode, binMetric) combo with bodyMass by file", () => {
    const analysisResults = [makeAnalysisResultWithClassicForceBinCounts("a.csv", [1, 1, 1])];
    analysisResults[0].analysis.meta.body_mass_kg = 90;

    const yieldedItems = Array.from(iterateEventRowsForAccDecDirection(analysisResults, "acc"));
    expect(yieldedItems.length).toBeGreaterThan(0);
    for (const yieldedItem of yieldedItems) {
      expect(yieldedItem).toEqual(
        expect.objectContaining({
          row: expect.objectContaining({ fileName: "a.csv" }),
          eventActivityScopeMode: expect.any(String),
          pitchZoneMode: expect.any(String),
          binMode: expect.any(String),
          binMetric: expect.any(String),
          bodyMass: 90,
        }),
      );
    }
    const seenCombos = new Set(
      yieldedItems.map(
        ({ eventActivityScopeMode, pitchZoneMode, binMode, binMetric }) =>
          `${eventActivityScopeMode}|${pitchZoneMode}|${binMode}|${binMetric}`,
      ),
    );
    expect(seenCombos.size).toBe(32);
  });
});

function makeAnalysisResultWithSampleStats(fileName) {
  const analysisTemplate = makeAnalysis();
  const overrideActivityScopeStats = {
    duration: 100,
    speed: { min: 1, mean: 2, median: 2, max: 3, area: 200 },
    acc: { min: 0, mean: 1, median: 1, max: 2, area: 50 },
    dec: { min: -2, mean: -1, median: -1, max: 0, area: 30 },
  };
  return makeAnalysisResult(fileName, {
    meta: { ...analysisTemplate.meta, body_mass_kg: 80 },
    sample_stats: {
      ...analysisTemplate.sample_stats,
      full: {
        ...analysisTemplate.sample_stats.full,
        all: overrideActivityScopeStats,
      },
    },
  });
}

describe("buildFilteredSampleStatsTableRows", () => {
  const baseArgs = {
    isAccDecDirectionHidden: () => false,
    statsActivityScopeMode: "all",
    pitchZoneMode: "full",
    analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
  };

  it("emits rows per metric per file in METRIC_ORDER", () => {
    const filteredSampleStatsTableRows = buildFilteredSampleStatsTableRows({
      ...baseArgs,
      visibleAnalysisResults: [makeAnalysisResultWithSampleStats("a.csv")],
    });
    expect(filteredSampleStatsTableRows.map((row) => row.tableMetricKey)).toEqual([
      "speed",
      "acc",
      "dec",
    ]);
    expect(filteredSampleStatsTableRows[0].fileName).toBe("a.csv");
    expect(filteredSampleStatsTableRows[0].metricLabel).toBe("Speed");
    expect(filteredSampleStatsTableRows[1].metricLabel).toBe("Acceleration");
    expect(filteredSampleStatsTableRows[2].metricLabel).toBe("Deceleration");
  });

  it("skips hidden acc/dec metrics but keeps speed", () => {
    const filteredSampleStatsTableRows = buildFilteredSampleStatsTableRows({
      ...baseArgs,
      visibleAnalysisResults: [makeAnalysisResultWithSampleStats("a.csv")],
      isAccDecDirectionHidden: (_fileName, accDecDirection) => accDecDirection === "acc",
    });
    expect(filteredSampleStatsTableRows.map((row) => row.tableMetricKey)).toEqual(["speed", "dec"]);
  });

  it("scales acc/dec stats by mass and remaps metric keys under force-velocity profile", () => {
    const filteredSampleStatsTableRows = buildFilteredSampleStatsTableRows({
      ...baseArgs,
      visibleAnalysisResults: [makeAnalysisResultWithSampleStats("a.csv")],
      analysisProfileConfig: FORCE_VELOCITY_ANALYSIS_PROFILE_CONFIG,
    });
    const accForceRow = filteredSampleStatsTableRows.find(
      (row) => row.tableMetricKey === "accForce",
    );
    expect(accForceRow.metricLabel).toBe("Acceleration Force");
    expect(accForceRow.stats.mean).toBe(80);
    expect(accForceRow.stats.area).toBe(4000);
    const speedRow = filteredSampleStatsTableRows.find((row) => row.tableMetricKey === "speed");
    expect(speedRow.stats.mean).toBe(2);
  });

  it("propagates duration from the activity scope", () => {
    const [firstRow] = buildFilteredSampleStatsTableRows({
      ...baseArgs,
      visibleAnalysisResults: [makeAnalysisResultWithSampleStats("a.csv")],
    });
    expect(firstRow.duration).toBe(100);
  });
});

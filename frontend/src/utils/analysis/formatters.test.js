import { describe, it, expect } from "vitest";

import {
  binLabelToRangeText,
  formatBinRange,
  formatOrDash,
  formatSpeedPair,
  formatToTwoDecimalPlaces,
  getNextSortRules,
  hexToRgba,
  relativeTimeSeriesToAbsoluteTimes,
  runLengthEncodingToSampleLabels,
  safeAbs,
  safeScaleByMass,
  secondsToTime,
  sortPoints,
} from "./formatters";

describe("safeScaleByMass", () => {
  it.each([
    [null, 80, null],
    [undefined, 80, null],
    [2, 80, 160],
    [0, 80, 0],
    [-1.5, 80, -120],
  ])("safeScaleByMass(%p, %p) === %p", (statOrMetricValue, bodyMass, expected) => {
    expect(safeScaleByMass(statOrMetricValue, bodyMass)).toBe(expected);
  });
});

describe("safeAbs", () => {
  it.each([
    [null, null],
    [undefined, null],
    [-3.5, 3.5],
    [3.5, 3.5],
    [0, 0],
  ])("safeAbs(%p) === %p", (statOrMetricValue, expected) => {
    expect(safeAbs(statOrMetricValue)).toBe(expected);
  });
});

describe("formatOrDash", () => {
  it("returns dash for null and undefined", () => {
    expect(formatOrDash(null, (numericValue) => String(numericValue))).toBe("-");
    expect(formatOrDash(undefined, (numericValue) => String(numericValue))).toBe("-");
  });

  it("delegates to the format function for non-nullish values", () => {
    expect(formatOrDash(3, (numericValue) => `x${numericValue}`)).toBe("x3");
  });
});

describe("formatToTwoDecimalPlaces", () => {
  it.each([
    [1.234, "1.23"],
    [0, "0.00"],
    [-1.5, "-1.50"],
    [null, "-"],
    [undefined, "-"],
  ])("formatToTwoDecimalPlaces(%p) === %p", (statOrMetricValue, expected) => {
    expect(formatToTwoDecimalPlaces(statOrMetricValue)).toBe(expected);
  });
});

describe("formatSpeedPair", () => {
  it.each([
    [2, "2.00 m/s (7.20 km/h)"],
    [0, "0.00 m/s (0.00 km/h)"],
    [null, "-"],
    [undefined, "-"],
  ])("formatSpeedPair(%p) === %p", (speedValueMPerS, expected) => {
    expect(formatSpeedPair(speedValueMPerS)).toBe(expected);
  });
});

describe("formatBinRange", () => {
  it("renders open-ended bin as >= lower bound", () => {
    expect(formatBinRange({ binLowerBound: 3.5, binUpperBound: null })).toBe(">=3.5");
  });

  it("renders closed bin as lower-upper", () => {
    expect(formatBinRange({ binLowerBound: 1.5, binUpperBound: 2.5 })).toBe("1.5-2.5");
  });

  it("trims trailing zeros produced by toFixed", () => {
    expect(formatBinRange({ binLowerBound: 2, binUpperBound: 3 })).toBe("2-3");
  });
});

describe("binLabelToRangeText", () => {
  it("passes 'All' through unchanged regardless of bin selection", () => {
    expect(binLabelToRangeText("All", "classic", "acc")).toBe("All");
  });

  it.each([
    ["classic", "acc", "Low", "0-2.5"],
    ["classic", "acc", "Very High", ">=3.5"],
    ["detailed", "acc", "0-3", "0-3"],
    ["detailed", "acc", "3-4", "3-4"],
    ["detailed", "acc", ">=7", ">=7"],
    ["classic", "force", "Low", "0-187.5"],
    ["classic", "force", "Very High", ">=262.5"],
  ])("binLabelToRangeText(%p, %p, %p) === %p", (binMode, binMetric, binLabel, expected) => {
    expect(binLabelToRangeText(binLabel, binMode, binMetric)).toBe(expected);
  });
});

describe("runLengthEncodingToSampleLabels", () => {
  it("expands run-length-encoded codes into per-sample labels", () => {
    expect(
      runLengthEncodingToSampleLabels([
        ["s", 2],
        ["i", 1],
        ["e", 3],
      ]),
    ).toEqual(["selected", "selected", "included", "excluded", "excluded", "excluded"]);
  });

  it("returns empty array for empty encoding", () => {
    expect(runLengthEncodingToSampleLabels([])).toEqual([]);
  });
});

describe("relativeTimeSeriesToAbsoluteTimes", () => {
  it("caches results for the same relative-time-series object reference", () => {
    const relativeTimeSeries = { start_time: "10:00:50.9", relative_times: [0] };
    const firstAbsoluteTimes = relativeTimeSeriesToAbsoluteTimes(relativeTimeSeries);
    const secondAbsoluteTimes = relativeTimeSeriesToAbsoluteTimes(relativeTimeSeries);
    expect(secondAbsoluteTimes).toBe(firstAbsoluteTimes);
  });

  it("wraps past midnight by taking modulo of one day", () => {
    const absoluteTimes = relativeTimeSeriesToAbsoluteTimes({
      start_time: "23:59:59.0",
      relative_times: [0, 2],
    });
    expect(absoluteTimes[0]).toBeCloseTo(86399);
    expect(absoluteTimes[1]).toBeCloseTo(1);
  });
});

describe("secondsToTime", () => {
  it.each([
    [0, "00:00:00.0"],
    [65, "00:01:05.0"],
    [12 * 3600 + 30 * 60 + 45.123, "12:30:45.1"],
    [3661.05, "01:01:01.1"],
  ])("secondsToTime(%p) === %p", (seconds, expected) => {
    expect(secondsToTime(seconds)).toBe(expected);
  });
});

describe("hexToRgba", () => {
  it.each([
    ["#ff8000", 0.5, "rgba(255, 128, 0, 0.5)"],
    ["#000000", 1, "rgba(0, 0, 0, 1)"],
    ["#ffffff", 0, "rgba(255, 255, 255, 0)"],
  ])("hexToRgba(%p, %p) === %p", (hexColor, alphaChannel, expected) => {
    expect(hexToRgba(hexColor, alphaChannel)).toBe(expected);
  });
});

describe("sortPoints", () => {
  const samplePoints = [
    { fileName: "b.csv", relativeTime: 1, speed: 3, acc: 2, metricValue: 5 },
    { fileName: "a.csv", relativeTime: 2, speed: 1, acc: 1, metricValue: 4 },
    { fileName: "a.csv", relativeTime: 1, speed: 2, acc: 3, metricValue: 4 },
  ];

  it("returns the original array reference when sortRules is empty", () => {
    expect(sortPoints(samplePoints, [])).toBe(samplePoints);
  });

  it.each([
    ["fileName", "asc", ["a.csv", "a.csv", "b.csv"]],
    ["fileName", "desc", ["b.csv", "a.csv", "a.csv"]],
  ])("sorts by fileName in %p direction %p", (sortKey, sortDirection, expectedFileNames) => {
    const sortedPoints = sortPoints(samplePoints, [{ sortKey, sortDirection }]);
    expect(sortedPoints.map((sortedPoint) => sortedPoint.fileName)).toEqual(expectedFileNames);
  });

  it.each([
    ["time", "asc", [1, 1, 2]],
    ["relativeTime", "desc", [2, 1, 1]],
  ])("sorts by %p in %p direction", (sortKey, sortDirection, expectedRelativeTimes) => {
    const sortedPoints = sortPoints(samplePoints, [{ sortKey, sortDirection }]);
    expect(sortedPoints.map((sortedPoint) => sortedPoint.relativeTime)).toEqual(
      expectedRelativeTimes,
    );
  });

  it("sorts by speed ascending", () => {
    const sortedPoints = sortPoints(samplePoints, [{ sortKey: "speed", sortDirection: "asc" }]);
    expect(sortedPoints.map((sortedPoint) => sortedPoint.speed)).toEqual([1, 2, 3]);
  });

  it("sorts by acc ascending", () => {
    const sortedPoints = sortPoints(samplePoints, [{ sortKey: "acc", sortDirection: "asc" }]);
    expect(sortedPoints.map((sortedPoint) => sortedPoint.acc)).toEqual([1, 2, 3]);
  });

  it("sorts by metricValue then breaks ties with a secondary rule", () => {
    const sortedPoints = sortPoints(samplePoints, [
      { sortKey: "metricValue", sortDirection: "asc" },
      { sortKey: "relativeTime", sortDirection: "desc" },
    ]);
    expect(
      sortedPoints.map((sortedPoint) => [sortedPoint.metricValue, sortedPoint.relativeTime]),
    ).toEqual([
      [4, 2],
      [4, 1],
      [5, 1],
    ]);
  });

  it("returns 0 when all sort keys tie, leaving relative order intact", () => {
    const tiedPoints = [
      { fileName: "a.csv", relativeTime: 1, speed: 1, acc: 1, metricValue: 1 },
      { fileName: "a.csv", relativeTime: 1, speed: 1, acc: 1, metricValue: 1 },
    ];
    const sortedPoints = sortPoints(tiedPoints, [
      { sortKey: "fileName", sortDirection: "asc" },
      { sortKey: "relativeTime", sortDirection: "asc" },
    ]);
    expect(sortedPoints).toEqual(tiedPoints);
  });

  it("does not mutate the input array", () => {
    const originalOrder = [...samplePoints];
    sortPoints(samplePoints, [{ sortKey: "speed", sortDirection: "asc" }]);
    expect(samplePoints).toEqual(originalOrder);
  });
});

describe("getNextSortRules", () => {
  it("appends a new ascending rule when the toggled key is not present", () => {
    expect(getNextSortRules([], "speed")).toEqual([{ sortKey: "speed", sortDirection: "asc" }]);
  });

  it("flips an existing ascending rule to descending", () => {
    expect(getNextSortRules([{ sortKey: "speed", sortDirection: "asc" }], "speed")).toEqual([
      { sortKey: "speed", sortDirection: "desc" },
    ]);
  });

  it("removes an existing descending rule on third toggle", () => {
    expect(getNextSortRules([{ sortKey: "speed", sortDirection: "desc" }], "speed")).toEqual([]);
  });

  it("preserves other rules when flipping direction of the toggled rule", () => {
    const previousSortRules = [
      { sortKey: "fileName", sortDirection: "asc" },
      { sortKey: "speed", sortDirection: "asc" },
    ];
    expect(getNextSortRules(previousSortRules, "speed")).toEqual([
      { sortKey: "fileName", sortDirection: "asc" },
      { sortKey: "speed", sortDirection: "desc" },
    ]);
  });

  it("preserves other rules when removing the toggled rule", () => {
    const previousSortRules = [
      { sortKey: "fileName", sortDirection: "asc" },
      { sortKey: "speed", sortDirection: "desc" },
    ];
    expect(getNextSortRules(previousSortRules, "speed")).toEqual([
      { sortKey: "fileName", sortDirection: "asc" },
    ]);
  });

  it("does not mutate the previous rules array when flipping direction", () => {
    const previousSortRules = [{ sortKey: "speed", sortDirection: "asc" }];
    const nextSortRules = getNextSortRules(previousSortRules, "speed");
    expect(previousSortRules).toEqual([{ sortKey: "speed", sortDirection: "asc" }]);
    expect(nextSortRules).not.toBe(previousSortRules);
  });
});

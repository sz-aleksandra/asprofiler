import { describe, it, expect } from "vitest";

import { makeAnalysis, directionEvents } from "../../../../../test/testUtils";

import {
  buildEarlyLateEventsStatsExportForAccDecDirection,
  buildEntireEventsStatsExportForAccDecDirection,
} from "./eventsStatsExport";

function makeAnalysisResult(fileName, statsOverridesByZoneScope = {}) {
  return {
    file_name: fileName,
    analysis: makeAnalysis({
      acc_events: directionEvents((pitchZone, activityScope, kind) => {
        if (kind !== "stats") return {};
        return statsOverridesByZoneScope[`${pitchZone}::${activityScope}`] ?? {};
      }),
      dec_events: directionEvents(),
    }),
  };
}

describe("buildEntireEventsStatsExportForAccDecDirection", () => {
  it("emits fixed 21 column header ending with body_mass_kg", () => {
    const { headers } = buildEntireEventsStatsExportForAccDecDirection([], "acc");
    expect(headers).toHaveLength(21);
    expect(headers[0]).toBe("file_name");
    expect(headers.at(-1)).toBe("body_mass_kg");
  });

  it("emits no rows for empty analysis results", () => {
    const { rows } = buildEntireEventsStatsExportForAccDecDirection([], "acc");
    expect(rows).toHaveLength(0);
  });

  it("emits one aggregate All row per (activity_scope × pitch_zone × bin_mode × bin_metric) combination", () => {
    const { rows } = buildEntireEventsStatsExportForAccDecDirection(
      [makeAnalysisResult("session.csv")],
      "acc",
    );
    expect(rows).toHaveLength(32);
    for (const rowCells of rows) {
      expect(rowCells[0]).toBe("session.csv");
      expect(rowCells[1]).toBe("acc");
      expect(rowCells[6]).toBe("All");
      expect(rowCells[7]).toBe("All");
      expect(rowCells.at(-1)).toBe(75);
    }
  });

  it("scales mean_magnitude and mean_relative_power by body mass for the matching combination", () => {
    const { rows } = buildEntireEventsStatsExportForAccDecDirection(
      [
        makeAnalysisResult("session.csv", {
          "full::all": {
            count: 2,
            mean_magnitude: 3,
            mean_relative_power_w_per_kg: 5,
            mean_horizontal_impulse: -0.4,
          },
        }),
      ],
      "acc",
    );
    const matchingRow = rows.find(
      (rowCells) =>
        rowCells[3] === "full" &&
        rowCells[2] === "all" &&
        rowCells[4] === "classic" &&
        rowCells[5] === "acc",
    );
    expect(matchingRow[8]).toBe(2);
    expect(matchingRow[15]).toBe(3);
    expect(matchingRow[16]).toBe(225);
    expect(matchingRow[17]).toBe(5);
    expect(matchingRow[18]).toBe(375);
    expect(matchingRow[19]).toBe(30);
  });

  it("returns null for scaled columns when their source stat is null", () => {
    const { rows } = buildEntireEventsStatsExportForAccDecDirection(
      [makeAnalysisResult("session.csv")],
      "acc",
    );
    const anyRow = rows[0];
    expect(anyRow[16]).toBeNull();
    expect(anyRow[18]).toBeNull();
    expect(anyRow[19]).toBeNull();
  });

  it("row width matches header width for every emitted row", () => {
    const { headers, rows } = buildEntireEventsStatsExportForAccDecDirection(
      [makeAnalysisResult("session.csv")],
      "acc",
    );
    for (const rowCells of rows) {
      expect(rowCells).toHaveLength(headers.length);
    }
  });
});

describe("buildEarlyLateEventsStatsExportForAccDecDirection", () => {
  it("emits fixed 26 column header with phase as the ninth column", () => {
    const { headers } = buildEarlyLateEventsStatsExportForAccDecDirection([], "acc");
    expect(headers).toHaveLength(26);
    expect(headers[8]).toBe("phase");
  });

  it.each([{ phaseLabel: "early" }, { phaseLabel: "late" }, { phaseLabel: "early_late_ratio" }])(
    "emits a row per combination for phase $phaseLabel",
    ({ phaseLabel }) => {
      const { rows } = buildEarlyLateEventsStatsExportForAccDecDirection(
        [makeAnalysisResult("session.csv")],
        "acc",
      );
      const phaseRows = rows.filter((rowCells) => rowCells[8] === phaseLabel);
      expect(phaseRows).toHaveLength(32);
    },
  );

  it("produces three phase rows per combination and 96 rows total", () => {
    const { rows } = buildEarlyLateEventsStatsExportForAccDecDirection(
      [makeAnalysisResult("session.csv")],
      "acc",
    );
    expect(rows).toHaveLength(96);
  });

  it("early phase applies safeScaleByMass and safeAbs for impulse using body mass", () => {
    const { rows } = buildEarlyLateEventsStatsExportForAccDecDirection(
      [
        makeAnalysisResult("session.csv", {
          "full::all": {
            count: 1,
            mean_early_mean_magnitude: 4,
            mean_early_peak_magnitude: 6,
            mean_early_mean_relative_power_w_per_kg: 8,
            mean_early_peak_relative_power_w_per_kg: 9,
            mean_early_impulse: -0.2,
          },
        }),
      ],
      "acc",
    );
    const earlyRow = rows.find(
      (rowCells) =>
        rowCells[8] === "early" &&
        rowCells[3] === "full" &&
        rowCells[2] === "all" &&
        rowCells[4] === "classic" &&
        rowCells[5] === "acc",
    );
    expect(earlyRow[16]).toBe(4);
    expect(earlyRow[17]).toBe(300);
    expect(earlyRow[18]).toBe(6);
    expect(earlyRow[19]).toBe(450);
    expect(earlyRow[20]).toBe(8);
    expect(earlyRow[21]).toBe(600);
    expect(earlyRow[22]).toBe(9);
    expect(earlyRow[23]).toBe(675);
    expect(earlyRow[24]).toBe(15);
  });

  it("late phase pulls mean_late_ values into the export row", () => {
    const { rows } = buildEarlyLateEventsStatsExportForAccDecDirection(
      [
        makeAnalysisResult("session.csv", {
          "full::all": {
            count: 1,
            mean_late_mean_magnitude: 2,
            mean_late_peak_magnitude: 3,
            mean_late_mean_relative_power_w_per_kg: 4,
            mean_late_peak_relative_power_w_per_kg: 7,
            mean_late_impulse: 0.5,
          },
        }),
      ],
      "acc",
    );
    const lateRow = rows.find(
      (rowCells) =>
        rowCells[8] === "late" &&
        rowCells[3] === "full" &&
        rowCells[2] === "all" &&
        rowCells[4] === "classic" &&
        rowCells[5] === "acc",
    );
    expect(lateRow[16]).toBe(2);
    expect(lateRow[17]).toBe(150);
    expect(lateRow[18]).toBe(3);
    expect(lateRow[19]).toBe(225);
    expect(lateRow[20]).toBe(4);
    expect(lateRow[21]).toBe(300);
    expect(lateRow[22]).toBe(7);
    expect(lateRow[23]).toBe(525);
    expect(lateRow[24]).toBe(37.5);
  });

  it("early_late_ratio row divides early by late without body mass scaling", () => {
    const { rows } = buildEarlyLateEventsStatsExportForAccDecDirection(
      [
        makeAnalysisResult("session.csv", {
          "full::all": {
            count: 1,
            mean_early_mean_magnitude: 4,
            mean_late_mean_magnitude: 2,
            mean_early_peak_magnitude: 6,
            mean_late_peak_magnitude: 3,
            mean_early_mean_relative_power_w_per_kg: 8,
            mean_late_mean_relative_power_w_per_kg: 4,
            mean_early_peak_relative_power_w_per_kg: 10,
            mean_late_peak_relative_power_w_per_kg: 5,
            mean_early_impulse: 10,
            mean_late_impulse: 5,
          },
        }),
      ],
      "acc",
    );
    const ratioRow = rows.find(
      (rowCells) =>
        rowCells[8] === "early_late_ratio" &&
        rowCells[3] === "full" &&
        rowCells[2] === "all" &&
        rowCells[4] === "classic" &&
        rowCells[5] === "acc",
    );
    expect(ratioRow[16]).toBe(2);
    expect(ratioRow[17]).toBe(2);
    expect(ratioRow[18]).toBe(2);
    expect(ratioRow[19]).toBe(2);
    expect(ratioRow[20]).toBe(2);
    expect(ratioRow[21]).toBe(2);
    expect(ratioRow[22]).toBe(2);
    expect(ratioRow[23]).toBe(2);
    expect(ratioRow[24]).toBe(2);
  });

  it.each([
    {
      description: "denominator is zero",
      statsOverrides: { count: 1, mean_early_mean_magnitude: 4, mean_late_mean_magnitude: 0 },
    },
    {
      description: "numerator is null",
      statsOverrides: { count: 1, mean_late_mean_magnitude: 2 },
    },
    {
      description: "denominator is null",
      statsOverrides: { count: 1, mean_early_mean_magnitude: 4 },
    },
  ])("early_late_ratio yields null when $description", ({ statsOverrides }) => {
    const { rows } = buildEarlyLateEventsStatsExportForAccDecDirection(
      [makeAnalysisResult("session.csv", { "full::all": statsOverrides })],
      "acc",
    );
    const ratioRow = rows.find(
      (rowCells) =>
        rowCells[8] === "early_late_ratio" &&
        rowCells[3] === "full" &&
        rowCells[2] === "all" &&
        rowCells[4] === "classic" &&
        rowCells[5] === "acc",
    );
    expect(ratioRow[16]).toBeNull();
  });

  it("row width matches header width for every emitted row", () => {
    const { headers, rows } = buildEarlyLateEventsStatsExportForAccDecDirection(
      [makeAnalysisResult("session.csv")],
      "acc",
    );
    for (const rowCells of rows) {
      expect(rowCells).toHaveLength(headers.length);
    }
  });
});

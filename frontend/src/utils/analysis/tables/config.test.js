import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { getAnalysisProfileConfig } from "../../analysis/constants";

import {
  formatEventBinLabel,
  buildAnalysisTableConfig,
  buildAccDecDirectionAnalysisProfileFitHeaders,
} from "./config";

const ACC_DEC = getAnalysisProfileConfig("accDecSpeedAnalysisProfile");
const FV = getAnalysisProfileConfig("forceVelocityAnalysisProfile");

describe("buildAccDecDirectionAnalysisProfileFitHeaders", () => {
  it.each([
    [ACC_DEC, "A0", "Intercept = hypothetical maximum absolute acceleration."],
    [FV, "F0", "Intercept = hypothetical maximum absolute force."],
  ])(
    "returns intercept header with mode-specific label + tooltip; then V0 and R² headers",
    (analysisProfileConfig, expectedInterceptLabel, expectedInterceptTooltip) => {
      const analysisProfileFitHeaders =
        buildAccDecDirectionAnalysisProfileFitHeaders(analysisProfileConfig);
      expect(
        analysisProfileFitHeaders.map(
          (analysisProfileFitHeader) =>
            analysisProfileFitHeader.accDecDirectionAnalysisProfileFitHeaderLabel,
        ),
      ).toEqual([expectedInterceptLabel, "V0", "R²"]);
      expect(analysisProfileFitHeaders[0].accDecDirectionAnalysisProfileFitTooltipText[0]).toBe(
        expectedInterceptTooltip,
      );
    },
  );
});

describe("formatEventBinLabel — classic acc metric (mass 1)", () => {
  it("passes All through unchanged", () => {
    expect(formatEventBinLabel("All", "classic", "acc")).toBe("All");
  });

  it("formats Low/High/Very High with acc ranges", () => {
    expect(formatEventBinLabel("Low", "classic", "acc")).toBe("Low (0-2.5)");
    expect(formatEventBinLabel("High", "classic", "acc")).toBe("High (2.5-3.5)");
    expect(formatEventBinLabel("Very High", "classic", "acc")).toBe("Very High (>=3.5)");
  });
});

describe("formatEventBinLabel — classic force metric (mass 75 baseline)", () => {
  it("scales bin edges by baseline body mass", () => {
    expect(formatEventBinLabel("Low", "classic", "force")).toBe("Low (0-187.5)");
    expect(formatEventBinLabel("High", "classic", "force")).toBe("High (187.5-262.5)");
    expect(formatEventBinLabel("Very High", "classic", "force")).toBe("Very High (>=262.5)");
  });
});

describe("formatEventBinLabel — detailed metric", () => {
  it("formats acc ranges", () => {
    expect(formatEventBinLabel("0-3", "detailed", "acc")).toBe("0-3");
    expect(formatEventBinLabel("3-4", "detailed", "acc")).toBe("3-4");
    expect(formatEventBinLabel("6-7", "detailed", "acc")).toBe("6-7");
    expect(formatEventBinLabel(">=7", "detailed", "acc")).toBe(">=7");
  });

  it("scales detailed force ranges by baseline mass", () => {
    expect(formatEventBinLabel("0-3", "detailed", "force")).toBe("0-225");
    expect(formatEventBinLabel("3-4", "detailed", "force")).toBe("225-300");
    expect(formatEventBinLabel(">=7", "detailed", "force")).toBe(">=525");
  });
});

function makeConfig(overrides = {}) {
  return buildAnalysisTableConfig({
    analysisProfileConfig: ACC_DEC,
    analysisResults: [{ file_name: "a.csv", analysis: { meta: { body_mass_kg: 80 } } }],
    formatEventBinLabel: (binLabel) => binLabel,
    filteredSampleStatsTableRows: [],
    ...overrides,
  });
}

describe("buildAnalysisTableConfig — top-level shape", () => {
  it("returns filteredSampleStatsTableRows, statsColumns, and builder fns", () => {
    const cfg = makeConfig();
    expect(Array.isArray(cfg.filteredSampleStatsTableRows)).toBe(true);
    expect(Array.isArray(cfg.statsColumns)).toBe(true);
    expect(typeof cfg.buildEntireEventStatTableColumns).toBe("function");
    expect(typeof cfg.buildEarlyLateEventStatTableColumns).toBe("function");
  });

  it("attaches units to each combined stats row", () => {
    const cfg = makeConfig({
      filteredSampleStatsTableRows: [
        { tableMetricKey: "speed", fileName: "a.csv", metricLabel: "Speed", stats: {} },
      ],
    });
    expect(cfg.filteredSampleStatsTableRows[0].units).toEqual({ value: "m/s", area: "km" });
  });

  it("buildEntireEventStatTableColumns wires bodyMassByFile lookup into force cell renderer", () => {
    const cfg = makeConfig({ analysisProfileConfig: FV });
    const entireEventStatTableColumns = cfg.buildEntireEventStatTableColumns(
      "PP",
      "HPI",
      "Ratio (A:D)",
      "acc",
    );
    const magnitudeColumn = entireEventStatTableColumns.find(
      (column) => column.columnKey === "magnitude",
    );
    const magnitudeCellText = render(
      magnitudeColumn.renderCell({ fileName: "a.csv", stats: { mean_magnitude: 1 } }),
    ).container.textContent;
    expect(magnitudeCellText).toContain("80");
  });

  it("buildEarlyLateEventStatTableColumns wires bodyMassByFile lookup into force cell renderer", () => {
    const cfg = makeConfig({ analysisProfileConfig: FV });
    const earlyLateEventStatTableColumns = cfg.buildEarlyLateEventStatTableColumns("acc");
    const magnitudeColumn = earlyLateEventStatTableColumns.find(
      (column) => column.columnKey === "meanMagnitude",
    );
    const magnitudeCellText = render(
      magnitudeColumn.renderCell({
        fileName: "a.csv",
        stats: { mean_early_mean_magnitude: 1, mean_late_mean_magnitude: 1 },
      }),
    ).container.textContent;
    expect(magnitudeCellText).toContain("80");
  });
});

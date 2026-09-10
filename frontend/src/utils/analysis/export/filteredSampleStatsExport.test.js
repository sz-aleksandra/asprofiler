import { describe, it, expect } from "vitest";

import { makeAnalysis, sampleStats } from "../../../../test/testUtils";

import { buildFilteredSampleStatsExportFile } from "./filteredSampleStatsExport";

function makeAnalysisResult(fileName) {
  return {
    file_name: fileName,
    analysis: makeAnalysis({
      sample_stats: sampleStats(() => ({
        duration: 100,
        speed: { min: 1, mean: 1, median: 1, max: 1, area: 1 },
        acc: { min: 2, mean: 2, median: 2, max: 2, area: 2 },
        dec: { min: 3, mean: 3, median: 3, max: 3, area: 3 },
      })),
    }),
  };
}

function parseCsvBody(csvContent) {
  return csvContent
    .replace(/^\uFEFF/, "")
    .split("\n")
    .filter(Boolean);
}

describe("buildFilteredSampleStatsExportFile", () => {
  it("returns a single CSV file with the fixed name", () => {
    const exportFile = buildFilteredSampleStatsExportFile([]);
    expect(exportFile.name).toBe("filtered_sample_stats.csv");
  });

  it("emits the fixed header with all documented columns", () => {
    const exportFile = buildFilteredSampleStatsExportFile([]);
    const headerCells = parseCsvBody(exportFile.content)[0].split(",");
    expect(headerCells).toEqual([
      "file_name",
      "activity_scope",
      "pitch_zone",
      "metric",
      "unit",
      "min",
      "mean",
      "median",
      "max",
      "area",
      "area_unit",
      "duration_s",
      "body_mass_kg",
    ]);
  });

  it("emits five metric rows for each (file × activity_scope × pitch_zone) combination", () => {
    const exportFile = buildFilteredSampleStatsExportFile([makeAnalysisResult("session.csv")]);
    const dataRows = parseCsvBody(exportFile.content).slice(1);
    expect(dataRows).toHaveLength(40);
  });

  it("row width matches header width for every data row", () => {
    const exportFile = buildFilteredSampleStatsExportFile([makeAnalysisResult("session.csv")]);
    const csvLines = parseCsvBody(exportFile.content);
    const headerColumnCount = csvLines[0].split(",").length;
    for (const dataLine of csvLines.slice(1)) {
      expect(dataLine.split(",")).toHaveLength(headerColumnCount);
    }
  });

  it.each([
    { metricKey: "speed", unit: "m_per_s", areaUnit: "m", expectedMin: "1" },
    { metricKey: "acc", unit: "m_per_s2", areaUnit: "m_per_s", expectedMin: "2" },
    { metricKey: "dec", unit: "m_per_s2", areaUnit: "m_per_s", expectedMin: "3" },
    { metricKey: "acc_force", unit: "N", areaUnit: "N_s", expectedMin: "150" },
    { metricKey: "dec_force", unit: "N", areaUnit: "N_s", expectedMin: "225" },
  ])(
    "emits row for metric $metricKey with unit $unit, area unit $areaUnit and correct min value",
    ({ metricKey, unit, areaUnit, expectedMin }) => {
      const exportFile = buildFilteredSampleStatsExportFile([makeAnalysisResult("session.csv")]);
      const dataRows = parseCsvBody(exportFile.content)
        .slice(1)
        .map((csvLine) => csvLine.split(","));
      const matchingRow = dataRows.find(
        (rowCells) => rowCells[3] === metricKey && rowCells[1] === "all" && rowCells[2] === "full",
      );
      expect(matchingRow[4]).toBe(unit);
      expect(matchingRow[5]).toBe(expectedMin);
      expect(matchingRow[10]).toBe(areaUnit);
    },
  );

  it("propagates activity_scope duration and per file body mass into every row", () => {
    const exportFile = buildFilteredSampleStatsExportFile([makeAnalysisResult("session.csv")]);
    const firstDataRowCells = parseCsvBody(exportFile.content)[1].split(",");
    expect(firstDataRowCells[11]).toBe("100");
    expect(firstDataRowCells[12]).toBe("75");
  });

  it("emits data rows across multiple analysis results in order", () => {
    const exportFile = buildFilteredSampleStatsExportFile([
      makeAnalysisResult("first.csv"),
      makeAnalysisResult("second.csv"),
    ]);
    const dataRows = parseCsvBody(exportFile.content).slice(1);
    expect(dataRows.filter((row) => row.startsWith("first.csv,"))).toHaveLength(40);
    expect(dataRows.filter((row) => row.startsWith("second.csv,"))).toHaveLength(40);
  });
});

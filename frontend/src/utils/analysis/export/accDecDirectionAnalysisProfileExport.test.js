import { describe, it, expect } from "vitest";

import { makeAnalysis } from "../../../../test/testUtils";

import { buildAnalysisProfileExportFiles } from "./accDecDirectionAnalysisProfileExport";

function makeAnalysisResult(overrides = {}) {
  return {
    file_name: "session.csv",
    analysis: makeAnalysis({
      acc_profile_fit: { intercept: 5, slope: -0.5, zero_crossing_speed: 10, r_squared: 0.9 },
      dec_profile_fit: { intercept: -5, slope: 0.5, zero_crossing_speed: 8, r_squared: 0.85 },
      time_series: {
        start_time: "10:01:00.1",
        relative_times: [0, 1, 2],
        speeds: [1, 2, 3],
        accs: [0.5, 1.0, 1.5],
        acc_labels: [
          ["s", 1],
          ["i", 1],
          ["e", 1],
        ],
        dec_labels: [["e", 3]],
        x: [],
        y: [],
      },
      ...overrides,
    }),
  };
}

function parseCsvBody(csvContent) {
  return csvContent
    .replace(/^\uFEFF/, "")
    .split("\n")
    .filter(Boolean);
}

describe("buildAnalysisProfileExportFiles", () => {
  it("emits acc + dec point CSVs and the profile fit CSV when fits are present", () => {
    const analysisProfileExportFiles = buildAnalysisProfileExportFiles([makeAnalysisResult()]);
    expect(analysisProfileExportFiles.map((exportFile) => exportFile.name)).toEqual([
      "acc_profile_points.csv",
      "dec_profile_points.csv",
      "acc_dec_profile_fit.csv",
    ]);
  });

  it("emits every row width matching header width for each generated CSV", () => {
    const analysisProfileExportFiles = buildAnalysisProfileExportFiles([makeAnalysisResult()]);
    for (const exportFile of analysisProfileExportFiles) {
      const csvLines = parseCsvBody(exportFile.content);
      const headerColumnCount = csvLines[0].split(",").length;
      for (const dataLine of csvLines.slice(1)) {
        expect(dataLine.split(",")).toHaveLength(headerColumnCount);
      }
    }
  });

  it.each([
    ["selected", 0],
    ["included", 0],
    ["excluded", 0],
  ])("decodes run length encoding label %s in acc profile points CSV", (expectedSampleLabel) => {
    const analysisProfileExportFiles = buildAnalysisProfileExportFiles([makeAnalysisResult()]);
    expect(analysisProfileExportFiles[0].content).toContain(expectedSampleLabel);
  });

  it("emits absolute time offset from time series start", () => {
    const analysisProfileExportFiles = buildAnalysisProfileExportFiles([makeAnalysisResult()]);
    expect(analysisProfileExportFiles[0].content).toContain("10:01:00.1");
    expect(analysisProfileExportFiles[0].content).toContain("10:01:01.1");
    expect(analysisProfileExportFiles[0].content).toContain("10:01:02.1");
  });

  it("scales acc value by body mass to derive force column", () => {
    const analysisProfileExportFiles = buildAnalysisProfileExportFiles([makeAnalysisResult()]);
    const firstDataRowCells = parseCsvBody(analysisProfileExportFiles[0].content)[1].split(",");
    expect(firstDataRowCells[8]).toBe("37.5");
    expect(firstDataRowCells[9]).toBe("75");
  });

  it.each([
    { accDecDirectionLabel: "Acceleration", expectedIntercept: "5", expectedForce: "375" },
    { accDecDirectionLabel: "Deceleration", expectedIntercept: "5", expectedForce: "375" },
  ])(
    "applies direction multiplier to $accDecDirectionLabel intercept and derived force",
    ({ accDecDirectionLabel, expectedIntercept, expectedForce }) => {
      const analysisProfileExportFiles = buildAnalysisProfileExportFiles([makeAnalysisResult()]);
      const fitCsvLines = parseCsvBody(analysisProfileExportFiles[2].content);
      const matchingLine = fitCsvLines.find((csvLine) => csvLine.includes(accDecDirectionLabel));
      const cells = matchingLine.split(",");
      expect(cells[3]).toBe(expectedIntercept);
      expect(cells[4]).toBe(expectedForce);
    },
  );

  it("skips profile fit CSV entirely when every fit is null", () => {
    const analysisProfileExportFiles = buildAnalysisProfileExportFiles([
      makeAnalysisResult({ acc_profile_fit: null, dec_profile_fit: null }),
    ]);
    expect(analysisProfileExportFiles.map((exportFile) => exportFile.name)).toEqual([
      "acc_profile_points.csv",
      "dec_profile_points.csv",
    ]);
  });

  it("emits profile fit CSV containing only the direction whose fit is present", () => {
    const analysisProfileExportFiles = buildAnalysisProfileExportFiles([
      makeAnalysisResult({ dec_profile_fit: null }),
    ]);
    const fitCsvLines = parseCsvBody(analysisProfileExportFiles[2].content);
    expect(fitCsvLines).toHaveLength(2);
    expect(fitCsvLines[1]).toContain("Acceleration");
  });

  it("includes the equation string formatted to two decimal places", () => {
    const analysisProfileExportFiles = buildAnalysisProfileExportFiles([makeAnalysisResult()]);
    expect(analysisProfileExportFiles[2].content).toContain("a = 5.00 + (-0.50) · v");
    expect(analysisProfileExportFiles[2].content).toContain("a = 5.00 + (-0.50) · v");
  });
});

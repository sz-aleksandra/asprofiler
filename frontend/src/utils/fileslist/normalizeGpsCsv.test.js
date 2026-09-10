import { describe, it, expect } from "vitest";

import { DEFAULT_CSV_FILTER } from "../shared/constants";

import { normalizeGpsCsvFile } from "./normalizeGpsCsv";

const GPS_CSV_HEADER = "Time,Speed (m/s),Lat,Lon,Hacc,Hdop,No. of Satellites";

function buildGpsCsvText(csvRows) {
  return [GPS_CSV_HEADER, ...csvRows].join("\n");
}

function buildGpsCsvFile(csvText, fileName = "session.csv", lastModified) {
  const fileOptions = { type: "text/csv" };
  if (lastModified !== undefined) fileOptions.lastModified = lastModified;
  return new File([csvText], fileName, fileOptions);
}

function normalize(gpsCsvFile, csvQualityFilters = DEFAULT_CSV_FILTER) {
  return normalizeGpsCsvFile(gpsCsvFile, csvQualityFilters);
}

describe("normalizeGpsCsvFile parseGpsCsv failure modes", () => {
  it.each([
    { label: "empty file", csvText: "" },
    { label: "header only", csvText: GPS_CSV_HEADER },
    { label: "blank-line only content", csvText: "\n\n" },
  ])("throws 'no data rows' for $label", async ({ csvText }) => {
    await expect(normalize(buildGpsCsvFile(csvText))).rejects.toThrow(/no data rows/);
  });

  it.each([
    {
      label: "one required column missing",
      csvText: "Time,Speed (m/s),Lat,Lon,Hacc,Hdop\n00:00:00,1,1,1,1,1",
      expectedMissing: /missing columns: No\. of Satellites/,
    },
    {
      label: "header is case-sensitive",
      csvText: "time,Speed (m/s),Lat,Lon,Hacc,Hdop,No. of Satellites\n00:00:00,1,1,1,1,1,10",
      expectedMissing: /missing columns: Time/,
    },
    {
      label: "multiple required columns missing",
      csvText: "Time,Speed (m/s),Lat,Lon\n00:00:00,1,1,1",
      expectedMissing: /missing columns: Hacc, Hdop, No\. of Satellites/,
    },
  ])("throws '$label' with missing column names", async ({ csvText, expectedMissing }) => {
    await expect(normalize(buildGpsCsvFile(csvText))).rejects.toThrow(expectedMissing);
  });
});

describe("normalizeGpsCsvFile quality filtering", () => {
  it("drops rows failing DEFAULT_CSV_FILTER thresholds", async () => {
    const csvText = buildGpsCsvText(["00:00:00,1.0,10,20,10,10,3", "00:00:01,2.0,11,21,1,0.5,10"]);
    const normalizedFile = await normalize(buildGpsCsvFile(csvText));
    const normalizedText = await normalizedFile.text();
    expect(normalizedText).toContain("00:00:01,2,11,21");
    expect(normalizedText).not.toContain("00:00:00");
  });

  it("throws when no rows pass quality filters", async () => {
    const csvText = buildGpsCsvText(["00:00:00,1.0,10,20,50,50,1"]);
    await expect(normalize(buildGpsCsvFile(csvText))).rejects.toThrow(/quality filters/);
  });

  it("respects custom filter overrides looser than defaults", async () => {
    const csvText = buildGpsCsvText(["00:00:00,1.0,10,20,10,10,3"]);
    const normalizedFile = await normalize(buildGpsCsvFile(csvText), {
      maxHorizontalAccuracyM: 100,
      maxHorizontalDilutionOfPrecision: 100,
      minSatelliteCount: 1,
    });
    expect(await normalizedFile.text()).toContain("00:00:00,1,10,20");
  });

  it("keeps only rows meeting filters in a mixed input", async () => {
    const csvText = buildGpsCsvText([
      "00:00:00,1.0,10,20,10,10,3",
      "00:00:01,2.0,11,21,1,0.5,10",
      "00:00:02,3.0,12,22,50,50,1",
      "00:00:03,4.0,13,23,1,0.5,10",
    ]);
    const normalizedText = await (await normalize(buildGpsCsvFile(csvText))).text();
    expect(normalizedText).toContain("00:00:01,2,11,21");
    expect(normalizedText).toContain("00:00:03,4,13,23");
    expect(normalizedText).not.toContain("00:00:00");
    expect(normalizedText).not.toContain("00:00:02");
  });
});

describe("normalizeGpsCsvFile timestamp collapsing and formatting", () => {
  it("collapses same-timestamp rows by averaging speed/lat/lon", async () => {
    const csvText = buildGpsCsvText(["00:00:00,1.0,10,20,1,0.5,10", "00:00:00,3.0,12,22,1,0.5,10"]);
    const normalizedText = await (await normalize(buildGpsCsvFile(csvText))).text();
    expect(normalizedText).toContain("00:00:00,2,11,21");
  });

  it("strips BOM prefix from CSV text", async () => {
    const csvText = "﻿" + buildGpsCsvText(["00:00:00,1.0,10,20,1,0.5,10"]);
    const normalizedText = await (await normalize(buildGpsCsvFile(csvText))).text();
    expect(normalizedText.startsWith("time,speed,lat,lon")).toBe(true);
  });

  it("accepts CRLF line endings", async () => {
    const csvText = [GPS_CSV_HEADER, "00:00:00,1.0,10,20,1,0.5,10"].join("\r\n");
    const normalizedText = await (await normalize(buildGpsCsvFile(csvText))).text();
    expect(normalizedText).toContain("00:00:00,1,10,20");
  });

  it("ignores blank lines between rows", async () => {
    const csvText = [
      GPS_CSV_HEADER,
      "00:00:00,1.0,10,20,1,0.5,10",
      "",
      "00:00:01,2.0,11,21,1,0.5,10",
    ].join("\n");
    const normalizedText = await (await normalize(buildGpsCsvFile(csvText))).text();
    expect(normalizedText).toContain("00:00:00,1,10,20");
    expect(normalizedText).toContain("00:00:01,2,11,21");
  });

  it("terminates the output CSV with a trailing newline", async () => {
    const csvText = buildGpsCsvText(["00:00:00,1.0,10,20,1,0.5,10"]);
    const normalizedText = await (await normalize(buildGpsCsvFile(csvText))).text();
    expect(normalizedText.endsWith("\n")).toBe(true);
  });
});

describe("normalizeGpsCsvFile output file metadata", () => {
  it("preserves fileName and lastModified from input", async () => {
    const csvText = buildGpsCsvText(["00:00:00,1.0,10,20,1,0.5,10"]);
    const inputFile = buildGpsCsvFile(csvText, "session.csv", 12345);
    const normalizedFile = await normalize(inputFile);
    expect(normalizedFile.name).toBe("session.csv");
    expect(normalizedFile.lastModified).toBe(12345);
    expect(normalizedFile.type).toBe("text/csv");
  });
});

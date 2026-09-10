import { describe, it, expect, afterEach } from "vitest";

import { cssVar, kmhToMPerS, mPerSToKmh } from "./conversions";

describe("mPerSToKmh", () => {
  it.each([
    { speedMPerS: 0, expectedSpeedKmh: 0 },
    { speedMPerS: 1, expectedSpeedKmh: 3.6 },
    { speedMPerS: 10, expectedSpeedKmh: 36 },
    { speedMPerS: 2.5, expectedSpeedKmh: 9 },
  ])("mPerSToKmh($speedMPerS) -> $expectedSpeedKmh", ({ speedMPerS, expectedSpeedKmh }) => {
    expect(mPerSToKmh(speedMPerS)).toBeCloseTo(expectedSpeedKmh);
  });
});

describe("kmhToMPerS", () => {
  it.each([
    { speedKmh: 0, expectedSpeedMPerS: 0 },
    { speedKmh: 3.6, expectedSpeedMPerS: 1 },
    { speedKmh: 36, expectedSpeedMPerS: 10 },
    { speedKmh: 9, expectedSpeedMPerS: 2.5 },
  ])("kmhToMPerS($speedKmh) -> $expectedSpeedMPerS", ({ speedKmh, expectedSpeedMPerS }) => {
    expect(kmhToMPerS(speedKmh)).toBeCloseTo(expectedSpeedMPerS);
  });
});

describe("kmhToMPerS and mPerSToKmh round-trip", () => {
  it.each([1, 5.5, 27.3])("mPerSToKmh -> kmhToMPerS preserves %s", (speedMPerS) => {
    expect(kmhToMPerS(mPerSToKmh(speedMPerS))).toBeCloseTo(speedMPerS);
  });
});

describe("cssVar", () => {
  const originalGetPropertyValue = document.documentElement.style.getPropertyValue.bind(
    document.documentElement.style,
  );

  afterEach(() => {
    document.documentElement.style.removeProperty("--asprofiler-test-color");
  });

  it("returns trimmed value of a CSS custom property set on :root", () => {
    document.documentElement.style.setProperty("--asprofiler-test-color", "  #abcdef  ");
    expect(cssVar("--asprofiler-test-color")).toBe("#abcdef");
    expect(originalGetPropertyValue("--asprofiler-test-color").trim()).toBe("#abcdef");
  });

  it("returns empty string when CSS custom property is undefined", () => {
    expect(cssVar("--asprofiler-missing-variable")).toBe("");
  });
});

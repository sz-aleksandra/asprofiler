import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";

import useAnalysisViewOptions from "./useAnalysisViewOptions";

beforeEach(() => {
  localStorage.clear();
});

const DEFAULT_ANALYSIS_VIEW_OPTION_EXPECTATIONS = [
  ["timeSeriesSpeedUnit", "m/s"],
  ["timeMode", "relative"],
  ["distributionYAxisScale", "log"],
  ["binMode", "detailed"],
  ["binMetric", "force"],
  ["eventActivityScopeMode", "high_speed_running"],
  ["pitchZoneMode", "full"],
  ["eventPhaseMode", "earlyLate"],
  ["statsActivityScopeMode", "all"],
  ["analysisMode", "accDecSpeedAnalysisProfile"],
];

const DEFAULT_SPEED_UNIT_EXPECTATIONS = [
  ["profilingSpeedUnit", "m/s"],
  ["eventSpeedUnit", "km/h"],
];

const SETTER_EXPECTATIONS = [
  ["setTimeSeriesSpeedUnit", "timeSeriesSpeedUnit", "km/h"],
  ["setTimeMode", "timeMode", "absolute"],
  ["setDistributionYAxisScale", "distributionYAxisScale", "linear"],
  ["setBinMode", "binMode", "classic"],
  ["setBinMetric", "binMetric", "acc"],
  ["setEventActivityScopeMode", "eventActivityScopeMode", "all"],
  ["setPitchZoneMode", "pitchZoneMode", "left"],
  ["setEventPhaseMode", "eventPhaseMode", "entire"],
  ["setStatsActivityScopeMode", "statsActivityScopeMode", "high_speed_running"],
  ["setAnalysisMode", "analysisMode", "forceVelocityAnalysisProfile"],
];

const SPEED_UNIT_SETTER_EXPECTATIONS = [
  ["setProfilingSpeedUnit", "profilingSpeedUnit", "km/h"],
  ["setEventSpeedUnit", "eventSpeedUnit", "m/s"],
];

describe("useAnalysisViewOptions", () => {
  it("exposes documented default values (top-level and speedUnitsState)", () => {
    const { result } = renderHook(() => useAnalysisViewOptions());
    for (const [
      analysisViewOptionKey,
      expectedDefaultValue,
    ] of DEFAULT_ANALYSIS_VIEW_OPTION_EXPECTATIONS) {
      expect(result.current[analysisViewOptionKey]).toBe(expectedDefaultValue);
    }
    for (const [speedUnitKey, expectedDefaultValue] of DEFAULT_SPEED_UNIT_EXPECTATIONS) {
      expect(result.current.speedUnitsState[speedUnitKey]).toBe(expectedDefaultValue);
    }
  });

  it("each top-level setter updates its state slice", () => {
    const { result } = renderHook(() => useAnalysisViewOptions());
    for (const [setterKey, valueKey, nextValue] of SETTER_EXPECTATIONS) {
      act(() => result.current[setterKey](nextValue));
      expect(result.current[valueKey]).toBe(nextValue);
    }
  });

  it("each speedUnitsState setter updates its state slice", () => {
    const { result } = renderHook(() => useAnalysisViewOptions());
    for (const [setterKey, valueKey, nextValue] of SPEED_UNIT_SETTER_EXPECTATIONS) {
      act(() => result.current.speedUnitsState[setterKey](nextValue));
      expect(result.current.speedUnitsState[valueKey]).toBe(nextValue);
    }
  });

  it("hydrates each option from localStorage when present", () => {
    localStorage.setItem("analysis_time_mode", JSON.stringify("absolute"));
    localStorage.setItem("analysis_event_speed_unit", JSON.stringify("m/s"));
    const { result } = renderHook(() => useAnalysisViewOptions());
    expect(result.current.timeMode).toBe("absolute");
    expect(result.current.speedUnitsState.eventSpeedUnit).toBe("m/s");
  });
});

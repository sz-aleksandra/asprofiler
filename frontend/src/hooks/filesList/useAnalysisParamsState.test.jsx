import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_ANALYSIS_PARAMS,
  DEFAULT_CSV_FILTER,
  DEFAULT_PREPROCESSING,
} from "../../utils/shared/constants";

import useAnalysisParamsState from "./useAnalysisParamsState";

beforeEach(() => {
  localStorage.clear();
});

describe("useAnalysisParamsState", () => {
  it("exposes documented defaults for each params slice", () => {
    const { result } = renderHook(() => useAnalysisParamsState());
    expect(result.current.analysisParams).toEqual(DEFAULT_ANALYSIS_PARAMS);
    expect(result.current.csvFilterParams).toEqual(DEFAULT_CSV_FILTER);
    expect(result.current.preprocessingParams).toEqual(DEFAULT_PREPROCESSING);
  });

  it("getAnalysisParamsForSelectedFile returns analysisParams merged with per-file overrides from storage", () => {
    localStorage.setItem("analysis_params", JSON.stringify({ baseParam: 1 }));
    localStorage.setItem(
      "analysis_params_map",
      JSON.stringify({ "alpha.csv": { overrideParam: 2 } }),
    );
    const { result } = renderHook(() => useAnalysisParamsState());
    expect(result.current.getAnalysisParamsForSelectedFile("alpha.csv")).toEqual({
      baseParam: 1,
      overrideParam: 2,
    });
    expect(result.current.getAnalysisParamsForSelectedFile("beta.csv")).toEqual({ baseParam: 1 });
  });

  it("each top-level updater sets its param key on the correct slice and persists it", () => {
    const { result } = renderHook(() => useAnalysisParamsState());
    const updaterExpectations = [
      ["updateAnalysisParam", "analysisParams", "analysis_params", "customParam", "value"],
      ["updateCsvFilterParam", "csvFilterParams", "analysis_csv_filter", "minSatelliteCount", 4],
      [
        "updatePreprocessingParam",
        "preprocessingParams",
        "analysis_preprocessing",
        "filter_mode",
        "mean",
      ],
    ];
    for (const [
      updaterKey,
      paramsKey,
      localStorageKey,
      paramKey,
      paramValue,
    ] of updaterExpectations) {
      act(() => result.current[updaterKey](paramKey, paramValue));
      expect(result.current[paramsKey][paramKey]).toBe(paramValue);
      expect(JSON.parse(localStorage.getItem(localStorageKey))).toMatchObject({
        [paramKey]: paramValue,
      });
    }
  });

  it("updateParamsForSelectedFile merges each (key, value) into that file's entry and persists", () => {
    const { result } = renderHook(() => useAnalysisParamsState());
    act(() => result.current.updateParamsForSelectedFile("alpha.csv", "body_mass_kg", 80));
    act(() => result.current.updateParamsForSelectedFile("alpha.csv", "customParam", 1));
    expect(result.current.getAnalysisParamsForSelectedFile("alpha.csv")).toMatchObject({
      body_mass_kg: 80,
      customParam: 1,
    });
    expect(JSON.parse(localStorage.getItem("analysis_params_map"))).toEqual({
      "alpha.csv": { body_mass_kg: 80, customParam: 1 },
    });
  });
});

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import useAnalysisResultColorsAndVisibility from "./useAnalysisResultColorsAndVisibility";

const analysisResults = [{ file_name: "alpha.csv" }, { file_name: "beta.csv" }];
const initialColorMap = { "alpha.csv": "#111111", "beta.csv": "#222222" };

describe("useAnalysisResultColorsAndVisibility colorMap", () => {
  it("returns the initial color for each analysis result before any override", () => {
    const { result } = renderHook(() =>
      useAnalysisResultColorsAndVisibility(analysisResults, initialColorMap),
    );
    expect(result.current.colorMap).toEqual({
      "alpha.csv": "#111111",
      "beta.csv": "#222222",
    });
  });

  it("setColorForFile overrides only the targeted file", () => {
    const { result } = renderHook(() =>
      useAnalysisResultColorsAndVisibility(analysisResults, initialColorMap),
    );
    act(() => result.current.setColorForFile("alpha.csv", "#abcdef"));
    expect(result.current.colorMap).toEqual({
      "alpha.csv": "#abcdef",
      "beta.csv": "#222222",
    });
  });
});

describe("useAnalysisResultColorsAndVisibility acc/dec visibility", () => {
  it("initially reports every acc-dec direction as visible", () => {
    const { result } = renderHook(() =>
      useAnalysisResultColorsAndVisibility(analysisResults, initialColorMap),
    );
    for (const accDecDirection of ["acc", "dec"]) {
      expect(result.current.isAccDecDirectionHidden("alpha.csv", accDecDirection)).toBe(false);
    }
  });

  it("setAccDecDirectionVisibility hides a single (file, direction) pair", () => {
    const { result } = renderHook(() =>
      useAnalysisResultColorsAndVisibility(analysisResults, initialColorMap),
    );
    act(() => result.current.setAccDecDirectionVisibility("alpha.csv", "acc", true));
    expect(result.current.isAccDecDirectionHidden("alpha.csv", "acc")).toBe(true);
    expect(result.current.isAccDecDirectionHidden("alpha.csv", "dec")).toBe(false);
    expect(result.current.isAccDecDirectionHidden("beta.csv", "acc")).toBe(false);
  });

  it("hideAllAccDecDirections hides every (file, direction) pair", () => {
    const { result } = renderHook(() =>
      useAnalysisResultColorsAndVisibility(analysisResults, initialColorMap),
    );
    act(() => result.current.hideAllAccDecDirections());
    for (const analysisResult of analysisResults) {
      for (const accDecDirection of ["acc", "dec"]) {
        expect(
          result.current.isAccDecDirectionHidden(analysisResult.file_name, accDecDirection),
        ).toBe(true);
      }
    }
  });

  it("showAllAccDecDirections clears all hidden state", () => {
    const { result } = renderHook(() =>
      useAnalysisResultColorsAndVisibility(analysisResults, initialColorMap),
    );
    act(() => result.current.hideAllAccDecDirections());
    act(() => result.current.showAllAccDecDirections());
    expect(result.current.isAccDecDirectionHidden("alpha.csv", "acc")).toBe(false);
    expect(result.current.isAccDecDirectionHidden("beta.csv", "dec")).toBe(false);
  });
});

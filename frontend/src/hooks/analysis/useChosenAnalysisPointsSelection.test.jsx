import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import useChosenAnalysisPointsSelection from "./useChosenAnalysisPointsSelection";

function chosenAnalysisPoint(fileName, timeSeriesIndex, overrides = {}) {
  return {
    fileName,
    timeSeriesIndex,
    relativeTime: overrides.relativeTime ?? 0,
    speed: overrides.speed ?? 0,
    metricValue: overrides.metricValue ?? 0,
    ...overrides,
  };
}

function analysisResults(...fileNames) {
  return fileNames.map((fileName) => ({ file_name: fileName }));
}

describe("useChosenAnalysisPointsSelection initial state", () => {
  it("returns empty lists and default before/after counts", () => {
    const { result } = renderHook(() => useChosenAnalysisPointsSelection([]));
    expect(result.current.chosenAnalysisPointsListState.chosenAnalysisPoints).toEqual([]);
    expect(result.current.chosenAnalysisPointsListState.beforeChosenAnalysisPointsCount).toBe(10);
    expect(result.current.chosenAnalysisPointsListState.afterChosenAnalysisPointsCount).toBe(10);
    expect(result.current.chosenAnalysisPointsSortState.chosenAnalysisPointsSortRules).toEqual([]);
    expect(result.current.chosenAnalysisPointsSortState.sortedChosenAnalysisPoints).toEqual([]);
    expect(result.current.selectedChosenAnalysisPointsState.selectedChosenAnalysisPointsCount).toBe(
      0,
    );
    expect(
      result.current.selectedChosenAnalysisPointsState.areAllChosenAnalysisPointsSelected,
    ).toBe(false);
  });

  it("each before/after counter setter updates its counter", () => {
    const { result } = renderHook(() => useChosenAnalysisPointsSelection([]));
    for (const [setterKey, valueKey, nextValue] of [
      ["setBeforeChosenAnalysisPointsCount", "beforeChosenAnalysisPointsCount", 5],
      ["setAfterChosenAnalysisPointsCount", "afterChosenAnalysisPointsCount", 7],
    ]) {
      act(() => result.current.chosenAnalysisPointsListState[setterKey](nextValue));
      expect(result.current.chosenAnalysisPointsListState[valueKey]).toBe(nextValue);
    }
  });
});

describe("useChosenAnalysisPointsSelection choose/remove", () => {
  it("onChooseAnalysisPoint adds a new point and toggles it off on repeat", () => {
    const { result } = renderHook(() =>
      useChosenAnalysisPointsSelection(analysisResults("alpha.csv")),
    );
    act(() =>
      result.current.chosenAnalysisPointsListState.onChooseAnalysisPoint(
        chosenAnalysisPoint("alpha.csv", 1),
      ),
    );
    expect(result.current.chosenAnalysisPointsListState.chosenAnalysisPoints).toHaveLength(1);
    act(() =>
      result.current.chosenAnalysisPointsListState.onChooseAnalysisPoint(
        chosenAnalysisPoint("alpha.csv", 1),
      ),
    );
    expect(result.current.chosenAnalysisPointsListState.chosenAnalysisPoints).toEqual([]);
  });

  it("onChooseAnalysisPoints adds only points that are not already chosen", () => {
    const { result } = renderHook(() =>
      useChosenAnalysisPointsSelection(analysisResults("alpha.csv")),
    );
    act(() =>
      result.current.chosenAnalysisPointsListState.onChooseAnalysisPoints([
        chosenAnalysisPoint("alpha.csv", 1),
        chosenAnalysisPoint("alpha.csv", 2),
      ]),
    );
    act(() =>
      result.current.chosenAnalysisPointsListState.onChooseAnalysisPoints([
        chosenAnalysisPoint("alpha.csv", 2),
        chosenAnalysisPoint("alpha.csv", 3),
      ]),
    );
    expect(
      result.current.chosenAnalysisPointsListState.chosenAnalysisPoints.map(
        (chosenPoint) => chosenPoint.timeSeriesIndex,
      ),
    ).toEqual([1, 2, 3]);
  });

  it("onChooseAnalysisPoints keeps the previous array reference when all points already exist", () => {
    const { result } = renderHook(() =>
      useChosenAnalysisPointsSelection(analysisResults("alpha.csv")),
    );
    act(() =>
      result.current.chosenAnalysisPointsListState.onChooseAnalysisPoints([
        chosenAnalysisPoint("alpha.csv", 1),
      ]),
    );
    const previousChosenAnalysisPoints =
      result.current.chosenAnalysisPointsListState.chosenAnalysisPoints;
    act(() =>
      result.current.chosenAnalysisPointsListState.onChooseAnalysisPoints([
        chosenAnalysisPoint("alpha.csv", 1),
      ]),
    );
    expect(result.current.chosenAnalysisPointsListState.chosenAnalysisPoints).toBe(
      previousChosenAnalysisPoints,
    );
  });

  it("filters chosen points down to currently visible analysis results", () => {
    const { result, rerender } = renderHook(
      ({ currentAnalysisResults }) => useChosenAnalysisPointsSelection(currentAnalysisResults),
      { initialProps: { currentAnalysisResults: analysisResults("alpha.csv", "beta.csv") } },
    );
    act(() =>
      result.current.chosenAnalysisPointsListState.onChooseAnalysisPoints([
        chosenAnalysisPoint("alpha.csv", 1),
        chosenAnalysisPoint("beta.csv", 1),
      ]),
    );
    rerender({ currentAnalysisResults: analysisResults("alpha.csv") });
    expect(
      result.current.chosenAnalysisPointsListState.chosenAnalysisPoints.map(
        (chosenPoint) => chosenPoint.fileName,
      ),
    ).toEqual(["alpha.csv"]);
    rerender({ currentAnalysisResults: analysisResults("alpha.csv", "beta.csv") });
    expect(result.current.chosenAnalysisPointsListState.chosenAnalysisPoints).toHaveLength(2);
  });

  it("removeChosenAnalysisPoint drops the matching point and its selection entry", () => {
    const { result } = renderHook(() =>
      useChosenAnalysisPointsSelection(analysisResults("alpha.csv")),
    );
    const pointToRemove = chosenAnalysisPoint("alpha.csv", 1);
    act(() =>
      result.current.chosenAnalysisPointsListState.onChooseAnalysisPoints([
        pointToRemove,
        chosenAnalysisPoint("alpha.csv", 2),
      ]),
    );
    act(() =>
      result.current.selectedChosenAnalysisPointsState.onToggleChosenAnalysisPointSelection(
        pointToRemove,
        true,
      ),
    );
    act(() =>
      result.current.chosenAnalysisPointsListState.removeChosenAnalysisPoint(pointToRemove),
    );
    expect(
      result.current.chosenAnalysisPointsListState.chosenAnalysisPoints.map(
        (chosenPoint) => chosenPoint.timeSeriesIndex,
      ),
    ).toEqual([2]);
    expect(
      result.current.selectedChosenAnalysisPointsState.selectedChosenAnalysisPointMap[
        "alpha.csv::1"
      ],
    ).toBeUndefined();
  });
});

describe("useChosenAnalysisPointsSelection selection", () => {
  it("onToggleChosenAnalysisPointSelection selects and deselects a single point", () => {
    const { result } = renderHook(() =>
      useChosenAnalysisPointsSelection(analysisResults("alpha.csv")),
    );
    const point = chosenAnalysisPoint("alpha.csv", 1);
    act(() => result.current.chosenAnalysisPointsListState.onChooseAnalysisPoint(point));
    act(() =>
      result.current.selectedChosenAnalysisPointsState.onToggleChosenAnalysisPointSelection(
        point,
        true,
      ),
    );
    expect(result.current.selectedChosenAnalysisPointsState.selectedChosenAnalysisPointsCount).toBe(
      1,
    );
    expect(
      result.current.selectedChosenAnalysisPointsState.areAllChosenAnalysisPointsSelected,
    ).toBe(true);
    act(() =>
      result.current.selectedChosenAnalysisPointsState.onToggleChosenAnalysisPointSelection(
        point,
        false,
      ),
    );
    expect(result.current.selectedChosenAnalysisPointsState.selectedChosenAnalysisPointsCount).toBe(
      0,
    );
  });

  it("onToggleAllChosenAnalysisPointsSelection selects or clears every visible point", () => {
    const { result } = renderHook(() =>
      useChosenAnalysisPointsSelection(analysisResults("alpha.csv")),
    );
    act(() =>
      result.current.chosenAnalysisPointsListState.onChooseAnalysisPoints([
        chosenAnalysisPoint("alpha.csv", 1),
        chosenAnalysisPoint("alpha.csv", 2),
      ]),
    );
    act(() =>
      result.current.selectedChosenAnalysisPointsState.onToggleAllChosenAnalysisPointsSelection(
        true,
      ),
    );
    expect(result.current.selectedChosenAnalysisPointsState.selectedChosenAnalysisPointsCount).toBe(
      2,
    );
    act(() =>
      result.current.selectedChosenAnalysisPointsState.onToggleAllChosenAnalysisPointsSelection(
        false,
      ),
    );
    expect(result.current.selectedChosenAnalysisPointsState.selectedChosenAnalysisPointsCount).toBe(
      0,
    );
  });

  it("areAllChosenAnalysisPointsSelected is false when there are no chosen points", () => {
    const { result } = renderHook(() =>
      useChosenAnalysisPointsSelection(analysisResults("alpha.csv")),
    );
    expect(
      result.current.selectedChosenAnalysisPointsState.areAllChosenAnalysisPointsSelected,
    ).toBe(false);
  });

  it("removeSelectedChosenAnalysisPoints deletes selected points and clears the selection", () => {
    const { result } = renderHook(() =>
      useChosenAnalysisPointsSelection(analysisResults("alpha.csv")),
    );
    const selectedPoint = chosenAnalysisPoint("alpha.csv", 1);
    act(() =>
      result.current.chosenAnalysisPointsListState.onChooseAnalysisPoints([
        selectedPoint,
        chosenAnalysisPoint("alpha.csv", 2),
      ]),
    );
    act(() =>
      result.current.selectedChosenAnalysisPointsState.onToggleChosenAnalysisPointSelection(
        selectedPoint,
        true,
      ),
    );
    act(() =>
      result.current.selectedChosenAnalysisPointsState.removeSelectedChosenAnalysisPoints(),
    );
    expect(
      result.current.chosenAnalysisPointsListState.chosenAnalysisPoints.map(
        (chosenPoint) => chosenPoint.timeSeriesIndex,
      ),
    ).toEqual([2]);
    expect(result.current.selectedChosenAnalysisPointsState.selectedChosenAnalysisPointsCount).toBe(
      0,
    );
  });
});

describe("useChosenAnalysisPointsSelection sorting", () => {
  it("onToggleChosenAnalysisPointsSortRule cycles asc, desc, then removes the rule", () => {
    const { result } = renderHook(() =>
      useChosenAnalysisPointsSelection(analysisResults("alpha.csv")),
    );
    act(() =>
      result.current.chosenAnalysisPointsListState.onChooseAnalysisPoints([
        chosenAnalysisPoint("alpha.csv", 1, { speed: 3 }),
        chosenAnalysisPoint("alpha.csv", 2, { speed: 1 }),
        chosenAnalysisPoint("alpha.csv", 3, { speed: 2 }),
      ]),
    );
    act(() =>
      result.current.chosenAnalysisPointsSortState.onToggleChosenAnalysisPointsSortRule("speed"),
    );
    expect(
      result.current.chosenAnalysisPointsSortState.sortedChosenAnalysisPoints.map(
        (chosenPoint) => chosenPoint.speed,
      ),
    ).toEqual([1, 2, 3]);
    act(() =>
      result.current.chosenAnalysisPointsSortState.onToggleChosenAnalysisPointsSortRule("speed"),
    );
    expect(
      result.current.chosenAnalysisPointsSortState.sortedChosenAnalysisPoints.map(
        (chosenPoint) => chosenPoint.speed,
      ),
    ).toEqual([3, 2, 1]);
    act(() =>
      result.current.chosenAnalysisPointsSortState.onToggleChosenAnalysisPointsSortRule("speed"),
    );
    expect(result.current.chosenAnalysisPointsSortState.chosenAnalysisPointsSortRules).toEqual([]);
  });
});

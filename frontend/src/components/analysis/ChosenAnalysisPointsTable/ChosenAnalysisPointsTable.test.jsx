import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import ChosenAnalysisPointsTable from "./ChosenAnalysisPointsTable";

function buildChosenAnalysisPointsTableState(overrides = {}) {
  const chosenAnalysisPoints = overrides.chosenAnalysisPoints ?? [
    { fileName: "a.csv", timeSeriesIndex: 0, relativeTime: 0.5, speed: 5, metricValue: 1.5 },
    { fileName: "b.csv", timeSeriesIndex: 1, relativeTime: 1.2, speed: 7, metricValue: 2.5 },
  ];
  return {
    chosenAnalysisPointsListState: {
      chosenAnalysisPoints,
      beforeChosenAnalysisPointsCount: 3,
      setBeforeChosenAnalysisPointsCount: vi.fn(),
      afterChosenAnalysisPointsCount: 4,
      setAfterChosenAnalysisPointsCount: vi.fn(),
      removeChosenAnalysisPoint: vi.fn(),
      ...overrides.chosenAnalysisPointsListState,
    },
    selectedChosenAnalysisPointsState: {
      areAllChosenAnalysisPointsSelected: false,
      onToggleAllChosenAnalysisPointsSelection: vi.fn(),
      selectedChosenAnalysisPointsCount: 0,
      removeSelectedChosenAnalysisPoints: vi.fn(),
      selectedChosenAnalysisPointMap: {},
      onToggleChosenAnalysisPointSelection: vi.fn(),
      ...overrides.selectedChosenAnalysisPointsState,
    },
    chosenAnalysisPointsSortState: {
      chosenAnalysisPointsSortRules: [],
      onToggleChosenAnalysisPointsSortRule: vi.fn(),
      sortedChosenAnalysisPoints: chosenAnalysisPoints,
      ...overrides.chosenAnalysisPointsSortState,
    },
  };
}

function renderChosenAnalysisPointsTable(overrides = {}) {
  const chosenAnalysisPointsTableState = buildChosenAnalysisPointsTableState(overrides);
  const formatChosenAnalysisPointTimeLabel = vi.fn(
    (chosenAnalysisPoint) => `t=${chosenAnalysisPoint.relativeTime}`,
  );
  render(
    <ChosenAnalysisPointsTable
      chosenAnalysisPointsTableState={chosenAnalysisPointsTableState}
      formatChosenAnalysisPointTimeLabel={formatChosenAnalysisPointTimeLabel}
    />,
  );
  return { chosenAnalysisPointsTableState, formatChosenAnalysisPointTimeLabel };
}

describe("ChosenAnalysisPointsTable", () => {
  it("clicking a header button toggles the sort rule for that column", async () => {
    const user = userEvent.setup();
    const { chosenAnalysisPointsTableState } = renderChosenAnalysisPointsTable();
    await user.click(screen.getByText(/File name\s+sort/));
    expect(
      chosenAnalysisPointsTableState.chosenAnalysisPointsSortState
        .onToggleChosenAnalysisPointsSortRule,
    ).toHaveBeenCalledWith("fileName");
  });

  it("clicking a row Remove button removes that chosen analysis point", async () => {
    const user = userEvent.setup();
    const { chosenAnalysisPointsTableState } = renderChosenAnalysisPointsTable();
    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    await user.click(removeButtons[0]);
    expect(
      chosenAnalysisPointsTableState.chosenAnalysisPointsListState.removeChosenAnalysisPoint,
    ).toHaveBeenCalledWith(
      chosenAnalysisPointsTableState.chosenAnalysisPointsListState.chosenAnalysisPoints[0],
    );
  });

  it("row checkbox reflects selection state and toggles selection on change", async () => {
    const user = userEvent.setup();
    const { chosenAnalysisPointsTableState } = renderChosenAnalysisPointsTable({
      selectedChosenAnalysisPointsState: {
        selectedChosenAnalysisPointMap: { "a.csv::0": true },
      },
    });
    const rowCheckboxes = screen.getAllByRole("checkbox");
    expect(rowCheckboxes[1]).toBeChecked();
    expect(rowCheckboxes[2]).not.toBeChecked();
    await user.click(rowCheckboxes[2]);
    expect(
      chosenAnalysisPointsTableState.selectedChosenAnalysisPointsState
        .onToggleChosenAnalysisPointSelection,
    ).toHaveBeenCalledWith(
      chosenAnalysisPointsTableState.chosenAnalysisPointsSortState.sortedChosenAnalysisPoints[1],
      true,
    );
  });
});

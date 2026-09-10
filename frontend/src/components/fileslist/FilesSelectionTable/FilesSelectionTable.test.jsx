import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import FilesSelectionTable from "./FilesSelectionTable";

function buildFilesSelection(overrides = {}) {
  const files = overrides.files ?? [
    { name: "run.csv", size: 500 },
    { name: "walk.csv", size: 2048 },
  ];
  const selectedFileNames = overrides.selectedFileNames ?? new Set();
  return {
    files,
    selectedFileNames,
    allSelected: overrides.allSelected ?? false,
    toggleFileSelection: vi.fn(),
    toggleAllFilesSelection: vi.fn(),
    removeFile: vi.fn(),
    removeSelectedFiles: vi.fn(),
    ...overrides,
  };
}

function renderFilesSelectionTable(overrides = {}) {
  const filesSelection = buildFilesSelection(overrides.filesSelection);
  const runSelectedFilesAnalysis = vi.fn();
  const renderSelectedFileParamsForm = vi.fn((file) => (
    <div data-testid={`params-${file.name}`}>params for {file.name}</div>
  ));
  render(
    <FilesSelectionTable
      filesSelection={filesSelection}
      isAnalyzingSelectedFiles={overrides.isAnalyzingSelectedFiles ?? false}
      runSelectedFilesAnalysis={runSelectedFilesAnalysis}
      renderSelectedFileParamsForm={renderSelectedFileParamsForm}
    />,
  );
  return { filesSelection, runSelectedFilesAnalysis, renderSelectedFileParamsForm };
}

describe("FilesSelectionTable", () => {
  it("renders one row per file", () => {
    renderFilesSelectionTable();
    expect(screen.getByText("run.csv")).toBeInTheDocument();
    expect(screen.getByText("walk.csv")).toBeInTheDocument();
  });

  it("renders empty message when there are no files", () => {
    renderFilesSelectionTable({ filesSelection: { files: [] } });
    expect(screen.getByText("No files yet.")).toBeInTheDocument();
  });

  it("expands the params form only for selected files", () => {
    const { renderSelectedFileParamsForm } = renderFilesSelectionTable({
      filesSelection: { selectedFileNames: new Set(["run.csv"]) },
    });
    expect(screen.getByTestId("params-run.csv")).toBeInTheDocument();
    expect(screen.queryByTestId("params-walk.csv")).not.toBeInTheDocument();
    expect(renderSelectedFileParamsForm).toHaveBeenCalledWith(
      expect.objectContaining({ name: "run.csv" }),
    );
  });

  it("toolbar Analyze selected runs analysis for every selected file", async () => {
    const user = userEvent.setup();
    const { runSelectedFilesAnalysis } = renderFilesSelectionTable({
      filesSelection: { selectedFileNames: new Set(["run.csv", "walk.csv"]) },
    });
    await user.click(screen.getByRole("button", { name: "Analyze selected" }));
    expect(runSelectedFilesAnalysis).toHaveBeenCalledWith(["run.csv", "walk.csv"]);
  });

  it("row Remove button removes only that file", async () => {
    const user = userEvent.setup();
    const { filesSelection } = renderFilesSelectionTable();
    const rowRemoveButtons = screen.getAllByRole("button", { name: "Remove" });
    await user.click(rowRemoveButtons[0]);
    expect(filesSelection.removeFile).toHaveBeenCalledWith("run.csv");
  });

  it("row checkbox toggles selection for that file", async () => {
    const user = userEvent.setup();
    const { filesSelection } = renderFilesSelectionTable();
    const rowCheckboxes = screen.getAllByRole("checkbox");
    await user.click(rowCheckboxes[1]);
    expect(filesSelection.toggleFileSelection).toHaveBeenCalledWith("run.csv");
  });
});

import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import useFilesSelection from "./useFilesSelection";

function fileWithName(fileName) {
  return new File([fileName], fileName);
}

describe("useFilesSelection initial state", () => {
  it("starts with empty files, empty selection, and allSelected false", () => {
    const { result } = renderHook(() => useFilesSelection());
    expect(result.current.files).toEqual([]);
    expect(result.current.selectedFileNames.size).toBe(0);
    expect(result.current.allSelected).toBe(false);
  });
});

describe("useFilesSelection pickFiles", () => {
  it("dedupes by name and sorts alphabetically", () => {
    const { result } = renderHook(() => useFilesSelection());
    act(() =>
      result.current.pickFiles([
        fileWithName("beta.csv"),
        fileWithName("alpha.csv"),
        fileWithName("alpha.csv"),
      ]),
    );
    expect(result.current.files.map((pickedFile) => pickedFile.name)).toEqual([
      "alpha.csv",
      "beta.csv",
    ]);
  });

  it("later pick overwrites earlier file with the same name", () => {
    const { result } = renderHook(() => useFilesSelection());
    const firstAlpha = fileWithName("alpha.csv");
    const secondAlpha = fileWithName("alpha.csv");
    act(() => result.current.pickFiles([firstAlpha]));
    act(() => result.current.pickFiles([secondAlpha]));
    expect(result.current.files).toEqual([secondAlpha]);
  });
});

describe("useFilesSelection toggleFileSelection", () => {
  it("adds a name on first toggle and removes it on second toggle", () => {
    const { result } = renderHook(() => useFilesSelection());
    act(() => result.current.toggleFileSelection("alpha.csv"));
    expect(result.current.selectedFileNames.has("alpha.csv")).toBe(true);
    act(() => result.current.toggleFileSelection("alpha.csv"));
    expect(result.current.selectedFileNames.has("alpha.csv")).toBe(false);
  });
});

describe("useFilesSelection toggleAllFilesSelection", () => {
  it("shouldSelectAll=true selects every picked file; shouldSelectAll=false clears selection", () => {
    const { result } = renderHook(() => useFilesSelection());
    act(() => result.current.pickFiles([fileWithName("alpha.csv"), fileWithName("beta.csv")]));
    for (const [shouldSelectAll, expectedSelectedFileNames, expectedAllSelected] of [
      [true, ["alpha.csv", "beta.csv"], true],
      [false, [], false],
    ]) {
      act(() => result.current.toggleAllFilesSelection(shouldSelectAll));
      expect([...result.current.selectedFileNames]).toEqual(expectedSelectedFileNames);
      expect(result.current.allSelected).toBe(expectedAllSelected);
    }
  });
});

describe("useFilesSelection remove", () => {
  it("removeFile drops the file from files and from the selection", () => {
    const { result } = renderHook(() => useFilesSelection());
    act(() => result.current.pickFiles([fileWithName("alpha.csv"), fileWithName("beta.csv")]));
    act(() => result.current.toggleFileSelection("alpha.csv"));
    act(() => result.current.removeFile("alpha.csv"));
    expect(result.current.files.map((pickedFile) => pickedFile.name)).toEqual(["beta.csv"]);
    expect(result.current.selectedFileNames.has("alpha.csv")).toBe(false);
  });

  it("removeSelectedFiles keeps only unselected files and clears the selection", () => {
    const { result } = renderHook(() => useFilesSelection());
    act(() =>
      result.current.pickFiles([
        fileWithName("alpha.csv"),
        fileWithName("beta.csv"),
        fileWithName("gamma.csv"),
      ]),
    );
    act(() => result.current.toggleFileSelection("alpha.csv"));
    act(() => result.current.toggleFileSelection("gamma.csv"));
    act(() => result.current.removeSelectedFiles());
    expect(result.current.files.map((pickedFile) => pickedFile.name)).toEqual(["beta.csv"]);
    expect(result.current.selectedFileNames.size).toBe(0);
  });
});

import { renderHook, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../utils/filesList/selectedFileAnalysis", () => ({
  analyzeSelectedFiles: vi.fn(),
  buildAnalysisNavState: vi.fn(),
  buildAnalyzeToast: vi.fn(),
}));

const navigateSpy = vi.fn();
vi.mock("react-router-dom", async () => {
  const actualReactRouterDom = await vi.importActual("react-router-dom");
  return { ...actualReactRouterDom, useNavigate: () => navigateSpy };
});

const { analyzeSelectedFiles, buildAnalysisNavState, buildAnalyzeToast } =
  await import("../../utils/filesList/selectedFileAnalysis");

import useSelectedFilesAnalysis from "./useSelectedFilesAnalysis";

function renderSelectedFilesAnalysis({
  files = [{ name: "alpha.csv" }, { name: "beta.csv" }],
  analysisParamsState = {
    analysisParams: { analysisParamKey: "analysisParamValue" },
    csvFilterParams: { csvFilterKey: "csvFilterValue" },
    preprocessingParams: { preprocessingKey: "preprocessingValue" },
    getAnalysisParamsForSelectedFile: (selectedFileName) => ({ perFile: selectedFileName }),
  },
  getColorForFile = (fileName) => `color-${fileName}`,
  setToastState = vi.fn(),
} = {}) {
  const renderHookResult = renderHook(
    () => useSelectedFilesAnalysis({ files, analysisParamsState, getColorForFile, setToastState }),
    { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> },
  );
  return { ...renderHookResult, setToastState };
}

beforeEach(() => {
  navigateSpy.mockReset();
  analyzeSelectedFiles.mockReset();
  buildAnalysisNavState.mockReset();
  buildAnalyzeToast.mockReset();
});

describe("useSelectedFilesAnalysis", () => {
  it("starts with isAnalyzingSelectedFiles=false", () => {
    const { result } = renderSelectedFilesAnalysis();
    expect(result.current.isAnalyzingSelectedFiles).toBe(false);
  });

  it("sets isAnalyzingSelectedFiles to true while awaiting analyzeSelectedFiles", async () => {
    let resolveAnalyzeSelectedFiles;
    analyzeSelectedFiles.mockReturnValue(
      new Promise((resolvePromise) => {
        resolveAnalyzeSelectedFiles = resolvePromise;
      }),
    );
    buildAnalyzeToast.mockReturnValue({ toastMessage: "done", toastVariant: "success" });
    const { result } = renderSelectedFilesAnalysis();
    act(() => {
      result.current.runSelectedFilesAnalysis(["alpha.csv"]);
    });
    await waitFor(() => expect(result.current.isAnalyzingSelectedFiles).toBe(true));
    await act(async () => {
      resolveAnalyzeSelectedFiles({ successfulAnalysisResults: [], failedAnalysisResults: [] });
    });
    expect(result.current.isAnalyzingSelectedFiles).toBe(false);
  });

  it("navigates to /analysis when there are successful analysis results", async () => {
    const successfulAnalysisResults = [{ file_name: "alpha.csv", analysis: {} }];
    analyzeSelectedFiles.mockResolvedValue({
      successfulAnalysisResults,
      failedAnalysisResults: [],
    });
    buildAnalysisNavState.mockReturnValue({ analysisResults: successfulAnalysisResults });
    buildAnalyzeToast.mockReturnValue({ toastMessage: "done", toastVariant: "success" });
    const { result, setToastState } = renderSelectedFilesAnalysis();

    await act(async () => {
      await result.current.runSelectedFilesAnalysis(["alpha.csv"]);
    });

    expect(analyzeSelectedFiles).toHaveBeenCalledWith({
      selectedFiles: [{ name: "alpha.csv" }],
      csvFilterParams: { csvFilterKey: "csvFilterValue" },
      analysisParams: { analysisParamKey: "analysisParamValue" },
      getAnalysisParamsForSelectedFile: expect.any(Function),
      preprocessingParams: { preprocessingKey: "preprocessingValue" },
    });
    expect(navigateSpy).toHaveBeenCalledWith("/analysis", {
      state: { analysisResults: successfulAnalysisResults },
    });
    expect(setToastState).toHaveBeenCalledWith({
      toastMessage: "done",
      toastVariant: "success",
    });
  });

  it("does not navigate when there are no successful analysis results", async () => {
    analyzeSelectedFiles.mockResolvedValue({
      successfulAnalysisResults: [],
      failedAnalysisResults: [{ file_name: "alpha.csv", error: "bad" }],
    });
    buildAnalyzeToast.mockReturnValue({ toastMessage: "failed", toastVariant: "error" });
    const { result, setToastState } = renderSelectedFilesAnalysis();

    await act(async () => {
      await result.current.runSelectedFilesAnalysis(["alpha.csv"]);
    });

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(setToastState).toHaveBeenCalledWith({ toastMessage: "failed", toastVariant: "error" });
  });

  it("sets an error toast when analyzeSelectedFiles rejects", async () => {
    analyzeSelectedFiles.mockRejectedValue(new Error("network"));
    const { result, setToastState } = renderSelectedFilesAnalysis();

    await act(async () => {
      await result.current.runSelectedFilesAnalysis(["alpha.csv"]);
    });

    expect(setToastState).toHaveBeenCalledWith({
      toastMessage: "network",
      toastVariant: "error",
    });
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(result.current.isAnalyzingSelectedFiles).toBe(false);
  });
});

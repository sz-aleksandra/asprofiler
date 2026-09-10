import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../api/analysisApi", () => ({
  postSelectedFilesAnalysis: vi.fn(),
}));

vi.mock("./normalizeGpsCsv", () => ({
  normalizeGpsCsvFile: vi.fn(),
}));

import { postSelectedFilesAnalysis } from "../../api/analysisApi";

import { normalizeGpsCsvFile } from "./normalizeGpsCsv";
import {
  buildAnalysisFormData,
  analyzeSelectedFiles,
  buildAnalyzeToast,
  buildAnalysisNavState,
} from "./selectedFileAnalysis";

const PREPROCESSING_PARAMS = { filter_mode: "butterworth", filter_window_samples: 5 };
const ANALYSIS_PARAMS = { min_acc_speed_m_per_s: 3, body_mass_kg: 75 };
const CSV_FILTER_PARAMS = {
  maxHorizontalAccuracyM: 2,
  maxHorizontalDilutionOfPrecision: 1,
  minSatelliteCount: 6,
};

const getNoPerFileOverridesForFile = () => ({});

function buildSelectedFile(fileName, fileContents = "csv-content") {
  return new File([fileContents], fileName, { type: "text/csv" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildAnalysisFormData", () => {
  it("attaches each selected file under the 'files' key in order", () => {
    const selectedFileA = buildSelectedFile("a.csv");
    const selectedFileB = buildSelectedFile("b.csv");
    const analysisFormData = buildAnalysisFormData(
      [selectedFileA, selectedFileB],
      getNoPerFileOverridesForFile,
      PREPROCESSING_PARAMS,
    );
    const attachedFiles = analysisFormData.getAll("files");
    expect(attachedFiles).toHaveLength(2);
    expect(attachedFiles[0].name).toBe("a.csv");
    expect(attachedFiles[1].name).toBe("b.csv");
  });

  it("serializes params with per_file_params and preprocessing_params", () => {
    const selectedFileA = buildSelectedFile("a.csv");
    const selectedFileB = buildSelectedFile("b.csv");
    const getAnalysisParamsForSelectedFile = (selectedFileName) => ({
      body_mass_kg: selectedFileName === "a.csv" ? 70 : 60,
    });
    const analysisFormData = buildAnalysisFormData(
      [selectedFileA, selectedFileB],
      getAnalysisParamsForSelectedFile,
      PREPROCESSING_PARAMS,
    );
    const serializedParams = JSON.parse(analysisFormData.get("params"));
    expect(serializedParams).toEqual({
      per_file_params: {
        "a.csv": { body_mass_kg: 70 },
        "b.csv": { body_mass_kg: 60 },
      },
      preprocessing_params: PREPROCESSING_PARAMS,
    });
  });

  it("produces empty per_file_params when no files are selected", () => {
    const analysisFormData = buildAnalysisFormData(
      [],
      getNoPerFileOverridesForFile,
      PREPROCESSING_PARAMS,
    );
    const serializedParams = JSON.parse(analysisFormData.get("params"));
    expect(serializedParams.per_file_params).toEqual({});
    expect(analysisFormData.getAll("files")).toEqual([]);
  });
});

describe("analyzeSelectedFiles", () => {
  it("returns successful and failed results when normalization and backend both succeed", async () => {
    const selectedFileA = buildSelectedFile("a.csv");
    const selectedFileB = buildSelectedFile("b.csv");
    const normalizedFileA = new File(["norm-a"], "a.csv", { type: "text/csv" });
    const normalizedFileB = new File(["norm-b"], "b.csv", { type: "text/csv" });
    normalizeGpsCsvFile.mockImplementation(async (selectedFile) =>
      selectedFile.name === "a.csv" ? normalizedFileA : normalizedFileB,
    );
    postSelectedFilesAnalysis.mockResolvedValue({
      results: [
        { file_name: "a.csv", analysis: { ok: true } },
        { file_name: "b.csv", error: "backend rejected" },
      ],
    });

    const analysisResults = await analyzeSelectedFiles({
      selectedFiles: [selectedFileA, selectedFileB],
      csvFilterParams: CSV_FILTER_PARAMS,
      analysisParams: ANALYSIS_PARAMS,
      getAnalysisParamsForSelectedFile: getNoPerFileOverridesForFile,
      preprocessingParams: PREPROCESSING_PARAMS,
    });

    expect(analysisResults.successfulAnalysisResults).toEqual([
      { file_name: "a.csv", analysis: { ok: true } },
    ]);
    expect(analysisResults.failedAnalysisResults).toEqual([
      { file_name: "b.csv", error: "backend rejected" },
    ]);
    expect(postSelectedFilesAnalysis).toHaveBeenCalledTimes(1);
    const submittedFormData = postSelectedFilesAnalysis.mock.calls[0][0];
    expect(submittedFormData.getAll("files").map((normalizedFile) => normalizedFile.name)).toEqual([
      "a.csv",
      "b.csv",
    ]);
  });

  it("includes normalization errors in failedAnalysisResults alongside backend errors", async () => {
    const selectedFileA = buildSelectedFile("a.csv");
    const selectedFileB = buildSelectedFile("b.csv");
    const normalizedFileB = new File(["norm-b"], "b.csv", { type: "text/csv" });
    normalizeGpsCsvFile.mockImplementation(async (selectedFile) => {
      if (selectedFile.name === "a.csv") throw new Error("bad CSV");
      return normalizedFileB;
    });
    postSelectedFilesAnalysis.mockResolvedValue({
      results: [{ file_name: "b.csv", analysis: { ok: true } }],
    });

    const analysisResults = await analyzeSelectedFiles({
      selectedFiles: [selectedFileA, selectedFileB],
      csvFilterParams: CSV_FILTER_PARAMS,
      analysisParams: ANALYSIS_PARAMS,
      getAnalysisParamsForSelectedFile: getNoPerFileOverridesForFile,
      preprocessingParams: PREPROCESSING_PARAMS,
    });

    expect(analysisResults.successfulAnalysisResults).toEqual([
      { file_name: "b.csv", analysis: { ok: true } },
    ]);
    expect(analysisResults.failedAnalysisResults).toEqual([
      { file_name: "a.csv", error: "bad CSV" },
    ]);
    const submittedFormData = postSelectedFilesAnalysis.mock.calls[0][0];
    expect(submittedFormData.getAll("files").map((normalizedFile) => normalizedFile.name)).toEqual([
      "b.csv",
    ]);
  });

  it("throws with joined error messages when every file fails normalization", async () => {
    const selectedFileA = buildSelectedFile("a.csv");
    const selectedFileB = buildSelectedFile("b.csv");
    normalizeGpsCsvFile.mockImplementation(async (selectedFile) => {
      throw new Error(selectedFile.name === "a.csv" ? "bad CSV a" : "bad CSV b");
    });

    await expect(
      analyzeSelectedFiles({
        selectedFiles: [selectedFileA, selectedFileB],
        csvFilterParams: CSV_FILTER_PARAMS,
        analysisParams: ANALYSIS_PARAMS,
        getAnalysisParamsForSelectedFile: getNoPerFileOverridesForFile,
        preprocessingParams: PREPROCESSING_PARAMS,
      }),
    ).rejects.toThrow("a.csv (bad CSV a), b.csv (bad CSV b)");
    expect(postSelectedFilesAnalysis).not.toHaveBeenCalled();
  });
});

describe("buildAnalyzeToast", () => {
  it("produces success variant with no failed suffix when all files succeed", () => {
    const analyzeToast = buildAnalyzeToast({
      failedAnalysisResults: [],
      selectedFileNames: ["a.csv", "b.csv"],
      successfulAnalysisResults: [{ file_name: "a.csv" }, { file_name: "b.csv" }],
    });
    expect(analyzeToast).toEqual({
      toastMessage: "Analyzed 2/2 selected file(s): a.csv, b.csv.",
      toastVariant: "success",
    });
  });

  it("appends failed suffix when some files failed", () => {
    const analyzeToast = buildAnalyzeToast({
      failedAnalysisResults: [{ file_name: "b.csv", error: "boom" }],
      selectedFileNames: ["a.csv", "b.csv"],
      successfulAnalysisResults: [{ file_name: "a.csv" }],
    });
    expect(analyzeToast.toastMessage).toBe(
      "Analyzed 1/2 selected file(s): a.csv, b.csv. Failed: b.csv (boom)",
    );
    expect(analyzeToast.toastVariant).toBe("success");
  });

  it("uses error variant when no successes occurred", () => {
    const analyzeToast = buildAnalyzeToast({
      failedAnalysisResults: [{ file_name: "a.csv", error: "boom" }],
      selectedFileNames: ["a.csv"],
      successfulAnalysisResults: [],
    });
    expect(analyzeToast.toastVariant).toBe("error");
    expect(analyzeToast.toastMessage).toBe(
      "Analyzed 0/1 selected file(s): a.csv. Failed: a.csv (boom)",
    );
  });

  it("truncates preview to first three file names with ellipsis when more than three", () => {
    const analyzeToast = buildAnalyzeToast({
      failedAnalysisResults: [],
      selectedFileNames: ["a.csv", "b.csv", "c.csv", "d.csv"],
      successfulAnalysisResults: [
        { file_name: "a.csv" },
        { file_name: "b.csv" },
        { file_name: "c.csv" },
        { file_name: "d.csv" },
      ],
    });
    expect(analyzeToast.toastMessage).toBe(
      "Analyzed 4/4 selected file(s): a.csv, b.csv, c.csv....",
    );
  });
});

describe("buildAnalysisNavState", () => {
  it("builds nav state with color map and forwarded params", () => {
    const successfulAnalysisResults = [
      { file_name: "a.csv", analysis: { ok: true } },
      { file_name: "b.csv", analysis: { ok: true } },
    ];
    const colorByFileName = { "a.csv": "#111111", "b.csv": "#222222" };
    const getColorForFile = (selectedFileName) => colorByFileName[selectedFileName];

    const analysisNavState = buildAnalysisNavState({
      successfulAnalysisResults,
      getColorForFile,
      analysisParams: ANALYSIS_PARAMS,
      csvFilterParams: CSV_FILTER_PARAMS,
      preprocessingParams: PREPROCESSING_PARAMS,
    });

    expect(analysisNavState).toEqual({
      analysisResults: successfulAnalysisResults,
      initialColorMap: { "a.csv": "#111111", "b.csv": "#222222" },
      analysisParams: ANALYSIS_PARAMS,
      csvFilterParams: CSV_FILTER_PARAMS,
      preprocessingParams: PREPROCESSING_PARAMS,
    });
  });

  it("produces empty color map when there are no successful results", () => {
    const analysisNavState = buildAnalysisNavState({
      successfulAnalysisResults: [],
      getColorForFile: () => "#unused",
      analysisParams: ANALYSIS_PARAMS,
      csvFilterParams: CSV_FILTER_PARAMS,
      preprocessingParams: PREPROCESSING_PARAMS,
    });
    expect(analysisNavState.initialColorMap).toEqual({});
    expect(analysisNavState.analysisResults).toEqual([]);
  });
});

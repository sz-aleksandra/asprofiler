import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const filesSelectionMock = vi.fn();
const analysisParamsStateMock = vi.fn();
const selectedFilesAnalysisMock = vi.fn();
const localStorageMock = vi.fn();

vi.mock("../../hooks/filesList/useFilesSelection", () => ({
  default: (...args) => filesSelectionMock(...args),
}));
vi.mock("../../hooks/filesList/useAnalysisParamsState", () => ({
  default: (...args) => analysisParamsStateMock(...args),
}));
vi.mock("../../hooks/filesList/useSelectedFilesAnalysis", () => ({
  default: (...args) => selectedFilesAnalysisMock(...args),
}));
vi.mock("../../hooks/shared/useLocalStorage", () => ({
  default: (...args) => localStorageMock(...args),
}));

vi.mock("../../utils/shared/conversions", async () => {
  const actualConversions = await vi.importActual("../../utils/shared/conversions");
  return { ...actualConversions, cssVar: () => "#ff0000" };
});

vi.mock("../../ui/Dropzone/Dropzone", () => ({
  default: ({ onFilesPicked }) => (
    <button data-testid="dropzone" onClick={() => onFilesPicked([{ name: "a.csv" }])} />
  ),
}));

vi.mock("../../ui/Toast/Toast", () => ({
  default: ({ toastMessage, onCloseToast }) =>
    toastMessage ? (
      <div data-testid="toast" onClick={onCloseToast}>
        {toastMessage}
      </div>
    ) : null,
}));

vi.mock("../../components/shared/AnalysisParamsForm/AnalysisParamsForm", () => ({
  default: (props) => (
    <div
      data-testid="analysis-params-form"
      data-disabled={String(props.isDisabled)}
      onClick={() => props.onDefaultColorChange("#00ffff")}
    />
  ),
}));

vi.mock(
  "../../components/filesList/PerSelectedFileAnalysisParamsForm/PerSelectedFileAnalysisParamsForm",
  () => ({
    default: (props) => (
      <div data-testid={`per-selected-file-${props.selectedFileColor}`}>
        <button
          data-testid="change-color"
          onClick={() => props.onSelectedFileColorChange("#0000ff")}
        />
        <button
          data-testid="change-param"
          onClick={() => props.onSelectedFileParamChange("body_mass_kg", 88)}
        />
      </div>
    ),
  }),
);

vi.mock("../../components/filesList/FilesSelectionTable/FilesSelectionTable", () => ({
  default: (props) => (
    <div data-testid="files-selection-table" data-busy={String(props.isAnalyzingSelectedFiles)}>
      <button
        data-testid="run-analysis"
        onClick={() => props.runSelectedFilesAnalysis(["a.csv"])}
      />
      <div data-testid="rendered-per-file">
        {props.filesSelection.files.map((file) => (
          <div key={file.name}>{props.renderSelectedFileParamsForm(file)}</div>
        ))}
      </div>
    </div>
  ),
}));

import FilesList from "./FilesList";

function buildAnalysisParamsState() {
  return {
    analysisParams: { min_acc_speed_m_per_s: 3 },
    csvFilterParams: { maxHorizontalAccuracyM: 2 },
    preprocessingParams: { filter_mode: "avg" },
    updateAnalysisParam: vi.fn(),
    updateCsvFilterParam: vi.fn(),
    updatePreprocessingParam: vi.fn(),
    updateParamsForSelectedFile: vi.fn(),
    getAnalysisParamsForSelectedFile: vi.fn(() => ({ body_mass_kg: 80 })),
  };
}

function buildFilesSelection(overrides = {}) {
  return {
    files: [{ name: "a.csv", size: 100 }],
    selectedFileNames: new Set(),
    allSelected: false,
    pickFiles: vi.fn(),
    toggleFileSelection: vi.fn(),
    toggleAllFilesSelection: vi.fn(),
    removeFile: vi.fn(),
    removeSelectedFiles: vi.fn(),
    ...overrides,
  };
}

const setDefaultColor = vi.fn();
const setColorMap = vi.fn();
const setProfilingSpeedUnit = vi.fn();
const setEventSpeedUnit = vi.fn();

function primeLocalStorage(colorMap = {}) {
  localStorageMock.mockImplementation((storageKey, initialValue) => {
    if (storageKey === "analysis_default_color") return ["#ff0000", setDefaultColor];
    if (storageKey === "analysis_color_map") return [colorMap, setColorMap];
    if (storageKey === "analysis_profiling_speed_unit") return ["m/s", setProfilingSpeedUnit];
    if (storageKey === "analysis_event_speed_unit") return ["km/h", setEventSpeedUnit];
    return [initialValue, vi.fn()];
  });
}

beforeEach(() => {
  filesSelectionMock.mockReset();
  analysisParamsStateMock.mockReset();
  selectedFilesAnalysisMock.mockReset();
  localStorageMock.mockReset();
  setDefaultColor.mockReset();
  setColorMap.mockReset();
  setProfilingSpeedUnit.mockReset();
  setEventSpeedUnit.mockReset();
  filesSelectionMock.mockReturnValue(buildFilesSelection());
  analysisParamsStateMock.mockReturnValue(buildAnalysisParamsState());
  selectedFilesAnalysisMock.mockReturnValue({
    isAnalyzingSelectedFiles: false,
    runSelectedFilesAnalysis: vi.fn(),
  });
  primeLocalStorage();
});

describe("FilesList", () => {
  it("renders the page title, Dropzone, params form, files table and no toast by default", () => {
    render(<FilesList />);
    expect(screen.getByRole("heading", { name: "Files" })).toBeInTheDocument();
    expect(screen.getByTestId("dropzone")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-params-form")).toBeInTheDocument();
    expect(screen.getByTestId("files-selection-table")).toBeInTheDocument();
    expect(screen.queryByTestId("toast")).not.toBeInTheDocument();
  });

  it("Dropzone forwards picked files to filesSelection.pickFiles", async () => {
    const user = userEvent.setup();
    const filesSelection = buildFilesSelection();
    filesSelectionMock.mockReturnValue(filesSelection);
    render(<FilesList />);
    await user.click(screen.getByTestId("dropzone"));
    expect(filesSelection.pickFiles).toHaveBeenCalledWith([{ name: "a.csv" }]);
  });

  it("changing a per-file param delegates to updateParamsForSelectedFile", async () => {
    const user = userEvent.setup();
    const analysisParamsState = buildAnalysisParamsState();
    analysisParamsStateMock.mockReturnValue(analysisParamsState);
    render(<FilesList />);
    await user.click(screen.getByTestId("change-param"));
    expect(analysisParamsState.updateParamsForSelectedFile).toHaveBeenCalledWith(
      "a.csv",
      "body_mass_kg",
      88,
    );
  });

  it("FilesSelectionTable runSelectedFilesAnalysis invokes the analysis runner", async () => {
    const user = userEvent.setup();
    const runSelectedFilesAnalysis = vi.fn();
    selectedFilesAnalysisMock.mockReturnValue({
      isAnalyzingSelectedFiles: false,
      runSelectedFilesAnalysis,
    });
    render(<FilesList />);
    await user.click(screen.getByTestId("run-analysis"));
    expect(runSelectedFilesAnalysis).toHaveBeenCalledWith(["a.csv"]);
  });
});

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const setIsAnalysisSidebarOpenMock = vi.fn();
let isAnalysisSidebarOpenValue = false;
let visibleAnalysisResultsValue = [{ file_name: "a.csv" }];

vi.mock("../../hooks/shared/useAnalysisSidebarOpen", () => ({
  useAnalysisSidebarOpen: () => ({
    isAnalysisSidebarOpen: isAnalysisSidebarOpenValue,
    setIsAnalysisSidebarOpen: setIsAnalysisSidebarOpenMock,
  }),
}));

vi.mock("../../utils/analysis/analysisState", () => ({
  buildAnalysisViewModel: () => ({
    visibleAnalysisResults: visibleAnalysisResultsValue,
    canUseAbsoluteTimeAxis: false,
    formatEventBinLabel: (binLabel) => binLabel,
    filteredSampleStatsTableRows: [],
  }),
}));

vi.mock("../../hooks/analysis/useAnalysisResultColorsAndVisibility", () => ({
  default: () => ({
    colorMap: { "a.csv": "#ff0000" },
    isAccDecDirectionHidden: () => false,
  }),
}));

const analysisViewOptionsStub = {
  analysisProfileMode: "accDecSpeedAnalysisProfile",
  setAnalysisProfileMode: () => {},
  timeMode: "relative",
  speedUnitsState: {},
};

vi.mock("../../hooks/analysis/useAnalysisViewOptions", () => ({
  default: () => analysisViewOptionsStub,
}));

vi.mock("../../hooks/analysis/useChosenAnalysisPointsSelection", () => ({
  default: () => ({
    chosenAnalysisPointsListState: {
      chosenAnalysisPoints: [],
      beforeChosenAnalysisPointsCount: 0,
      afterChosenAnalysisPointsCount: 0,
    },
    selectedChosenAnalysisPointsState: {},
    chosenAnalysisPointsSortState: {
      sortedChosenAnalysisPoints: [],
      chosenAnalysisPointsSortRules: [],
    },
  }),
}));

vi.mock("../../utils/analysis/tables/config", () => ({
  buildAnalysisTableConfig: () => ({}),
}));

vi.mock("../../utils/analysis/constants", async () => {
  const actualConstants = await vi.importActual("../../utils/analysis/constants");
  return {
    ...actualConstants,
    getAnalysisProfileConfig: (analysisProfileMode) => ({
      isForce: analysisProfileMode === "forceVelocityAnalysisProfile",
      mode: analysisProfileMode,
    }),
  };
});

vi.mock("../../components/shared/AnalysisParamsForm/AnalysisParamsForm", () => ({
  default: (props) => (
    <div data-testid="analysis-params-form" data-disabled={String(props.isDisabled)} />
  ),
}));

vi.mock("../../components/analysis/AnalysisSidebar/AnalysisSidebar", () => ({
  default: (props) => (
    <div
      data-testid="analysis-sidebar"
      data-open={String(props.isOpen)}
      data-relative-time-label={props.formatChosenAnalysisPointTimeLabel({
        relativeTime: 1.5,
        absoluteTime: 42,
      })}
    >
      <button data-testid="analysis-sidebar-close" onClick={props.onCloseAnalysisSidebar} />
    </div>
  ),
}));

vi.mock("./sections/AccDecDirectionAnalysisProfileSection", () => ({
  default: (props) => (
    <div
      data-testid="section-acc-dec-analysis-profile"
      data-force={String(props.analysisProfileConfig?.isForce)}
    />
  ),
}));

vi.mock("./sections/DistributionsAndEventsSection", () => ({
  default: () => <div data-testid="section-distributions-and-events" />,
}));

vi.mock("./sections/FilteredSampleStatsSection", () => ({
  default: () => <div data-testid="section-filtered-sample-stats" />,
}));

vi.mock("./sections/TimeSeriesAndTrajectorySection", () => ({
  default: () => <div data-testid="section-time-series-and-trajectory" />,
}));

vi.mock("../../utils/analysis/export/analysisBundleExport", () => ({
  exportAnalysis: vi.fn(),
}));

import { exportAnalysis } from "../../utils/analysis/export/analysisBundleExport";

import Analysis from "./Analysis";

function renderAnalysis(analysisStateOverrides = {}) {
  const analysisState = {
    analysisResults: [{ file_name: "a.csv" }],
    initialColorMap: {},
    analysisParams: { sampleAnalysisParam: 1 },
    csvFilterParams: { sampleCsvFilterParam: 2 },
    preprocessingParams: { samplePreprocessingParam: 3 },
    ...analysisStateOverrides,
  };
  return render(<Analysis analysisState={analysisState} />);
}

beforeEach(() => {
  setIsAnalysisSidebarOpenMock.mockReset();
  isAnalysisSidebarOpenValue = false;
  visibleAnalysisResultsValue = [{ file_name: "a.csv" }];
  analysisViewOptionsStub.analysisProfileMode = "accDecSpeedAnalysisProfile";
  exportAnalysis.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Analysis page", () => {
  it("renders the sidebar, params form, export toolbar, and every section when visible results are present", () => {
    renderAnalysis();
    expect(screen.getByTestId("analysis-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-params-form")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export all/i })).toBeInTheDocument();
    expect(screen.getByTestId("section-acc-dec-analysis-profile")).toBeInTheDocument();
    expect(screen.getByTestId("section-filtered-sample-stats")).toBeInTheDocument();
    expect(screen.getByTestId("section-time-series-and-trajectory")).toBeInTheDocument();
    expect(screen.getByTestId("section-distributions-and-events")).toBeInTheDocument();
  });

  it("hides section stack and shows 'All series hidden' message when visibleAnalysisResults is empty", () => {
    visibleAnalysisResultsValue = [];
    renderAnalysis();
    expect(screen.getByText(/All series hidden/i)).toBeInTheDocument();
    expect(screen.queryByTestId("section-filtered-sample-stats")).not.toBeInTheDocument();
    expect(screen.queryByTestId("section-time-series-and-trajectory")).not.toBeInTheDocument();
    expect(screen.queryByTestId("section-distributions-and-events")).not.toBeInTheDocument();
  });

  it("Export All calls exportAnalysis with analysisResults + params from analysisState", async () => {
    const user = userEvent.setup();
    renderAnalysis();
    await user.click(screen.getByRole("button", { name: /export all/i }));
    expect(exportAnalysis).toHaveBeenCalledWith({
      analysisResults: [{ file_name: "a.csv" }],
      analysisParams: { sampleAnalysisParam: 1 },
      csvFilterParams: { sampleCsvFilterParam: 2 },
      preprocessingParams: { samplePreprocessingParam: 3 },
    });
  });
});

import { act, render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPlotlyChartHook = vi.fn();
vi.mock("../../../hooks/analysis/usePlotlyChart", () => ({
  default: (hookArgs) => mockPlotlyChartHook(hookArgs),
}));

vi.mock("../../../utils/shared/conversions", async () => {
  const actual = await vi.importActual("../../../utils/shared/conversions");
  return {
    ...actual,
    cssVar: () => "#000000",
  };
});

const buildChartData = vi.fn();
const buildTimeSeriesXAxisTickConfig = vi.fn(() => ({
  tickmode: "array",
  tickvals: [0],
  ticktext: ["0"],
}));
const buildLayout = vi.fn(({ timeSeriesLayoutShapes, timeSeriesXAxisTickConfig }) => ({
  shapes: timeSeriesLayoutShapes,
  tickConfig: timeSeriesXAxisTickConfig,
}));

vi.mock("../../../utils/analysis/charts/timeSeriesChart", () => ({
  buildTimeSeriesChartData: (chartDataArgs) => buildChartData(chartDataArgs),
  buildTimeSeriesXAxisTickConfig: (...tickArgs) => buildTimeSeriesXAxisTickConfig(...tickArgs),
  buildTimeSeriesChartLayout: (layoutArgs) => buildLayout(layoutArgs),
}));

import TimeSeriesChart from "./TimeSeriesChart";

function defaultProps(overrides = {}) {
  return {
    timeSeriesChartTitle: "TS",
    timeSeriesChartYAxisTitle: "y",
    metricTimeSeriesList: [{ x: [0, 1], y: [1, 2] }],
    timeSeriesChartValueLabelFormatter: (value) => String(value),
    timeSeriesChartXAxisTitle: "x",
    timeSeriesChartXAxisIncludesZero: true,
    formatTimeSeriesChartXTickLabel: (value) => String(value),
    formatTimeSeriesChartXHoverLabel: (value) => String(value),
    chosenAnalysisPointsState: {
      chosenAnalysisPoints: [],
      beforeChosenAnalysisPointsCount: 0,
      afterChosenAnalysisPointsCount: 0,
    },
    ...overrides,
  };
}

function getRelayoutHandler() {
  const call = mockPlotlyChartHook.mock.calls.at(-1)[0];
  return call.plotlyEvents.find((plotlyEvent) => plotlyEvent.name === "plotly_relayout").handler;
}

beforeEach(() => {
  mockPlotlyChartHook.mockClear();
  buildChartData.mockReset();
  buildTimeSeriesXAxisTickConfig.mockClear();
  buildLayout.mockClear();
});

describe("TimeSeriesChart", () => {
  it("renders chart and passes traces + layout when data present", () => {
    buildChartData.mockReturnValue({
      traces: [{ x: [0] }],
      shapes: [{ type: "line" }],
      referenceX: [0, 1],
      referenceLabels: ["a", "b"],
    });
    const { container } = render(<TimeSeriesChart {...defaultProps()} />);
    expect(container.querySelector("div")).not.toBeNull();
    const call = mockPlotlyChartHook.mock.calls[0][0];
    expect(call.isPlotlyChartEnabled).toBe(true);
    expect(call.plotlyTraces).toEqual([{ x: [0] }]);
    expect(call.plotlyLayout).toMatchObject({ shapes: [{ type: "line" }] });
  });

  it("zoom event stores visible x range and re-derives tickConfig with range", () => {
    buildChartData.mockReturnValue({
      traces: [],
      shapes: [],
      referenceX: [0, 1, 2],
      referenceLabels: ["a", "b", "c"],
    });
    render(<TimeSeriesChart {...defaultProps()} />);
    buildTimeSeriesXAxisTickConfig.mockClear();
    act(() => getRelayoutHandler()({ "xaxis.range[0]": 0.5, "xaxis.range[1]": 1.5 }));
    expect(buildTimeSeriesXAxisTickConfig).toHaveBeenCalledWith(
      [0, 1, 2],
      ["a", "b", "c"],
      expect.any(Function),
      0.5,
      1.5,
    );
  });

  it("autorange event resets visible x range to null (drops range args)", () => {
    buildChartData.mockReturnValue({
      traces: [],
      shapes: [],
      referenceX: [0, 1, 2],
      referenceLabels: ["a", "b", "c"],
    });
    render(<TimeSeriesChart {...defaultProps()} />);
    act(() => getRelayoutHandler()({ "xaxis.range[0]": 0.5, "xaxis.range[1]": 1.5 }));
    buildTimeSeriesXAxisTickConfig.mockClear();
    act(() => getRelayoutHandler()({ "xaxis.autorange": true }));
    const lastCall = buildTimeSeriesXAxisTickConfig.mock.calls.at(-1);
    expect(lastCall.slice(3)).toEqual([undefined, undefined]);
  });
});

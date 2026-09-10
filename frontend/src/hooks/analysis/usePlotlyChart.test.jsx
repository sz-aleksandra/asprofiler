import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const plotlyReactSpy = vi.fn();
const plotlyPurgeSpy = vi.fn();
const plotlyResizeSpy = vi.fn();

vi.mock("plotly.js-dist-min", () => ({
  default: {
    react: (...plotlyReactArgs) => plotlyReactSpy(...plotlyReactArgs),
    purge: (...plotlyPurgeArgs) => plotlyPurgeSpy(...plotlyPurgeArgs),
    Plots: { resize: (...plotlyResizeArgs) => plotlyResizeSpy(...plotlyResizeArgs) },
  },
}));

import usePlotlyChart from "./usePlotlyChart";

let capturedResizeObserverCallback = null;
const resizeObserverObserveSpy = vi.fn();
const resizeObserverDisconnectSpy = vi.fn();
const resizeObserverUnobserveSpy = vi.fn();

class MockResizeObserver {
  constructor(resizeObserverCallback) {
    capturedResizeObserverCallback = resizeObserverCallback;
  }
  observe(observedTarget) {
    resizeObserverObserveSpy(observedTarget);
  }
  disconnect() {
    resizeObserverDisconnectSpy();
  }
  unobserve(observedTarget) {
    resizeObserverUnobserveSpy(observedTarget);
  }
}

function makeChartContainerNode() {
  const chartContainerNode = document.createElement("div");
  chartContainerNode.on = vi.fn();
  chartContainerNode.removeListener = vi.fn();
  return chartContainerNode;
}

function renderUsePlotlyChart(initialProps) {
  return renderHook(
    (usePlotlyChartProps) => {
      const chartContainerRef = useRef(usePlotlyChartProps.chartContainerNode);
      usePlotlyChart({ ...usePlotlyChartProps, chartContainerRef });
    },
    { initialProps },
  );
}

beforeEach(() => {
  plotlyReactSpy.mockClear();
  plotlyPurgeSpy.mockClear();
  plotlyResizeSpy.mockClear();
  resizeObserverObserveSpy.mockClear();
  resizeObserverDisconnectSpy.mockClear();
  resizeObserverUnobserveSpy.mockClear();
  capturedResizeObserverCallback = null;
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usePlotlyChart render", () => {
  it("does nothing when chartContainerRef is null", () => {
    renderUsePlotlyChart({
      chartContainerNode: null,
      plotlyTraces: [{ x: [1] }],
      plotlyLayout: {},
      isPlotlyChartEnabled: true,
    });
    expect(plotlyReactSpy).not.toHaveBeenCalled();
    expect(plotlyPurgeSpy).not.toHaveBeenCalled();
    expect(resizeObserverObserveSpy).not.toHaveBeenCalled();
  });

  it("purges when the chart is disabled or has no plotly traces", () => {
    for (const extraProps of [
      { isPlotlyChartEnabled: false, plotlyTraces: [{ x: [1] }] },
      { isPlotlyChartEnabled: true, plotlyTraces: null },
    ]) {
      plotlyPurgeSpy.mockClear();
      const chartContainerNode = makeChartContainerNode();
      plotlyReactSpy.mockClear();
      renderUsePlotlyChart({ chartContainerNode, plotlyLayout: {}, ...extraProps });
      expect(plotlyPurgeSpy).toHaveBeenCalledWith(chartContainerNode);
      expect(plotlyReactSpy).not.toHaveBeenCalled();
    }
  });

  it("calls Plotly.react with node, traces, layout, and the default plotly config", () => {
    const chartContainerNode = makeChartContainerNode();
    const plotlyTraces = [{ x: [1] }];
    const plotlyLayout = { title: "chart" };
    renderUsePlotlyChart({
      chartContainerNode,
      plotlyTraces,
      plotlyLayout,
      isPlotlyChartEnabled: true,
    });
    expect(plotlyReactSpy).toHaveBeenCalledWith(chartContainerNode, plotlyTraces, plotlyLayout, {
      responsive: true,
      displayModeBar: true,
    });
  });

  it("re-runs Plotly.react when traces change and does not purge", () => {
    const chartContainerNode = makeChartContainerNode();
    const { rerender } = renderUsePlotlyChart({
      chartContainerNode,
      plotlyTraces: [{ x: [1] }],
      plotlyLayout: {},
      isPlotlyChartEnabled: true,
    });
    plotlyReactSpy.mockClear();
    plotlyPurgeSpy.mockClear();
    rerender({
      chartContainerNode,
      plotlyTraces: [{ x: [2] }],
      plotlyLayout: {},
      isPlotlyChartEnabled: true,
    });
    expect(plotlyPurgeSpy).not.toHaveBeenCalled();
    expect(plotlyReactSpy).toHaveBeenCalledWith(
      chartContainerNode,
      [{ x: [2] }],
      {},
      expect.any(Object),
    );
  });
});

describe("usePlotlyChart resize observer", () => {
  it("observes the container and forwards resize events to Plotly.Plots.resize", () => {
    const chartContainerNode = makeChartContainerNode();
    renderUsePlotlyChart({
      chartContainerNode,
      plotlyTraces: [{ x: [1] }],
      plotlyLayout: {},
      isPlotlyChartEnabled: true,
    });
    expect(resizeObserverObserveSpy).toHaveBeenCalledWith(chartContainerNode);
    capturedResizeObserverCallback();
    expect(plotlyResizeSpy).toHaveBeenCalledWith(chartContainerNode);
  });
});

describe("usePlotlyChart plotly events", () => {
  it("attaches each supplied plotly event listener and dispatches events to its handler", () => {
    const chartContainerNode = makeChartContainerNode();
    const clickHandler = vi.fn();
    renderUsePlotlyChart({
      chartContainerNode,
      plotlyTraces: [{ x: [1] }],
      plotlyLayout: {},
      isPlotlyChartEnabled: true,
      plotlyEvents: [{ name: "plotly_click", handler: clickHandler }],
    });
    expect(chartContainerNode.on).toHaveBeenCalledWith("plotly_click", expect.any(Function));
    const dispatchPlotlyEvent = chartContainerNode.on.mock.calls[0][1];
    dispatchPlotlyEvent({ points: [] });
    expect(clickHandler).toHaveBeenCalledWith({ points: [] });
  });

  it("uses the latest handler when handler identity changes but event names stay the same", () => {
    const chartContainerNode = makeChartContainerNode();
    const firstClickHandler = vi.fn();
    const secondClickHandler = vi.fn();
    const { rerender } = renderUsePlotlyChart({
      chartContainerNode,
      plotlyTraces: [{ x: [1] }],
      plotlyLayout: {},
      isPlotlyChartEnabled: true,
      plotlyEvents: [{ name: "plotly_click", handler: firstClickHandler }],
    });
    expect(chartContainerNode.on).toHaveBeenCalledTimes(1);
    const dispatchPlotlyEvent = chartContainerNode.on.mock.calls[0][1];
    rerender({
      chartContainerNode,
      plotlyTraces: [{ x: [1] }],
      plotlyLayout: {},
      isPlotlyChartEnabled: true,
      plotlyEvents: [{ name: "plotly_click", handler: secondClickHandler }],
    });
    expect(chartContainerNode.on).toHaveBeenCalledTimes(1);
    expect(chartContainerNode.removeListener).not.toHaveBeenCalled();
    dispatchPlotlyEvent({ points: [1] });
    expect(firstClickHandler).not.toHaveBeenCalled();
    expect(secondClickHandler).toHaveBeenCalledWith({ points: [1] });
  });

  it("re-subscribes listeners when the set of event names changes", () => {
    const chartContainerNode = makeChartContainerNode();
    const eventHandler = vi.fn();
    const { rerender } = renderUsePlotlyChart({
      chartContainerNode,
      plotlyTraces: [{ x: [1] }],
      plotlyLayout: {},
      isPlotlyChartEnabled: true,
      plotlyEvents: [{ name: "plotly_click", handler: eventHandler }],
    });
    rerender({
      chartContainerNode,
      plotlyTraces: [{ x: [1] }],
      plotlyLayout: {},
      isPlotlyChartEnabled: true,
      plotlyEvents: [
        { name: "plotly_click", handler: eventHandler },
        { name: "plotly_selected", handler: eventHandler },
      ],
    });
    expect(chartContainerNode.removeListener).toHaveBeenCalledWith(
      "plotly_click",
      expect.any(Function),
    );
    expect(chartContainerNode.on).toHaveBeenCalledWith("plotly_click", expect.any(Function));
    expect(chartContainerNode.on).toHaveBeenCalledWith("plotly_selected", expect.any(Function));
  });
});

describe("usePlotlyChart default plotlyEvents", () => {
  it("does not register any event listener when plotlyEvents is omitted (default NO_EVENTS)", () => {
    const chartContainerNode = makeChartContainerNode();
    renderUsePlotlyChart({
      chartContainerNode,
      plotlyTraces: [{ x: [1] }],
      plotlyLayout: {},
      isPlotlyChartEnabled: true,
    });
    expect(chartContainerNode.on).not.toHaveBeenCalled();
  });
});

describe("usePlotlyChart cleanup", () => {
  it("removes listeners, disconnects the resize observer, and purges on unmount", () => {
    const chartContainerNode = makeChartContainerNode();
    const clickHandler = vi.fn();
    const { unmount } = renderUsePlotlyChart({
      chartContainerNode,
      plotlyTraces: [{ x: [1] }],
      plotlyLayout: {},
      isPlotlyChartEnabled: true,
      plotlyEvents: [{ name: "plotly_click", handler: clickHandler }],
    });
    const dispatchPlotlyEvent = chartContainerNode.on.mock.calls[0][1];
    plotlyPurgeSpy.mockClear();
    unmount();
    expect(chartContainerNode.removeListener).toHaveBeenCalledWith(
      "plotly_click",
      dispatchPlotlyEvent,
    );
    expect(resizeObserverDisconnectSpy).toHaveBeenCalledTimes(1);
    expect(plotlyPurgeSpy).toHaveBeenCalledWith(chartContainerNode);
  });
});

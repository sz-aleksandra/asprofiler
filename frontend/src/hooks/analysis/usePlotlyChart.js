import Plotly from "plotly.js-dist-min";
import { useEffect, useRef } from "react";
const PLOTLY_CONFIG = {
  responsive: true,
  displayModeBar: true,
};
const NO_EVENTS = [];
export default function usePlotlyChart({
  plotlyEvents = NO_EVENTS,
  chartContainerRef,
  isPlotlyChartEnabled,
  plotlyTraces,
  plotlyLayout,
}) {
  const plotlyEventsRef = useRef(plotlyEvents);
  useEffect(() => {
    plotlyEventsRef.current = plotlyEvents;
  }, [plotlyEvents]);
  useEffect(() => {
    const chartContainerNode = chartContainerRef.current;
    if (!chartContainerNode) return;
    if (!isPlotlyChartEnabled || !plotlyTraces) {
      Plotly.purge(chartContainerNode);
      return;
    }
    Plotly.react(chartContainerNode, plotlyTraces, plotlyLayout, PLOTLY_CONFIG);
  }, [chartContainerRef, plotlyTraces, plotlyLayout, isPlotlyChartEnabled]);
  useEffect(() => {
    const chartContainerNode = chartContainerRef.current;
    if (!chartContainerNode) return;
    const chartContainerResizeObserver = new ResizeObserver(() =>
      Plotly.Plots.resize(chartContainerNode),
    );
    chartContainerResizeObserver.observe(chartContainerNode);
    return () => chartContainerResizeObserver.disconnect();
  }, [chartContainerRef]);
  const plotlyEventNamesKey = plotlyEvents
    .map((plotlyEventConfig) => plotlyEventConfig.name)
    .sort()
    .join("|");
  useEffect(() => {
    const chartContainerNode = chartContainerRef.current;
    if (!chartContainerNode || !plotlyEventNamesKey) return;
    const plotlyEventNames = plotlyEventNamesKey.split("|");
    const attachedPlotlyEventListeners = plotlyEventNames.map((plotlyEventName) => {
      const dispatchPlotlyEvent = (plotlyEvent) => {
        const currentPlotlyEventConfig = plotlyEventsRef.current.find(
          (plotlyEventConfig) => plotlyEventConfig.name === plotlyEventName,
        );
        currentPlotlyEventConfig.handler(plotlyEvent);
      };
      chartContainerNode.on(plotlyEventName, dispatchPlotlyEvent);
      return {
        plotlyEventName,
        dispatchPlotlyEvent,
      };
    });
    return () =>
      attachedPlotlyEventListeners.forEach(({ plotlyEventName, dispatchPlotlyEvent }) =>
        chartContainerNode.removeListener(plotlyEventName, dispatchPlotlyEvent),
      );
  }, [chartContainerRef, plotlyEventNamesKey]);
  useEffect(() => {
    const chartContainerNode = chartContainerRef.current;
    return () => {
      if (chartContainerNode) Plotly.purge(chartContainerNode);
    };
  }, [chartContainerRef]);
}

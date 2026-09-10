import { useRef, useState } from "react";

import usePlotlyChart from "../../../hooks/analysis/usePlotlyChart";
import {
  buildTimeSeriesChartLayout,
  buildTimeSeriesChartData,
  buildTimeSeriesXAxisTickConfig,
} from "../../../utils/analysis/charts/timeSeriesChart";

import styles from "./TimeSeriesChart.module.css";
const EMPTY_REFERENCE_LINES = [];
export default function TimeSeriesChart({
  metricTimeSeriesList,
  chosenAnalysisPointsState: {
    chosenAnalysisPoints,
    beforeChosenAnalysisPointsCount,
    afterChosenAnalysisPointsCount,
  },
  timeSeriesChartSpeedReferenceLines = EMPTY_REFERENCE_LINES,
  formatTimeSeriesChartXHoverLabel,
  timeSeriesChartValueLabelFormatter,
  timeSeriesChartTitle,
  timeSeriesChartXAxisTitle,
  timeSeriesChartYAxisTitle,
  timeSeriesChartXAxisIncludesZero,
  formatTimeSeriesChartXTickLabel,
}) {
  const timeSeriesChartContainerRef = useRef(null);
  const [visibleXAxisRange, setVisibleXAxisRange] = useState(null);
  const chartData = buildTimeSeriesChartData({
    metricTimeSeriesList,
    chosenAnalysisPoints,
    beforeChosenAnalysisPointsCount,
    afterChosenAnalysisPointsCount,
    timeSeriesChartSpeedReferenceLines,
    formatTimeSeriesChartXHoverLabel,
    timeSeriesChartValueLabelFormatter,
  });
  usePlotlyChart({
    chartContainerRef: timeSeriesChartContainerRef,
    plotlyTraces: chartData?.traces,
    plotlyLayout: chartData
      ? buildTimeSeriesChartLayout({
          timeSeriesChartTitle,
          timeSeriesChartXAxisTitle,
          timeSeriesChartYAxisTitle,
          shouldIncludeZeroOnTimeSeriesChartXAxis: timeSeriesChartXAxisIncludesZero,
          timeSeriesLayoutShapes: chartData.shapes,
          timeSeriesXAxisTickConfig: buildTimeSeriesXAxisTickConfig(
            chartData.referenceX,
            chartData.referenceLabels,
            formatTimeSeriesChartXTickLabel,
            visibleXAxisRange?.[0],
            visibleXAxisRange?.[1],
          ),
        })
      : null,
    isPlotlyChartEnabled: !!chartData,
    plotlyEvents: [
      {
        name: "plotly_relayout",
        handler: (plotlyRelayoutEvent) => {
          if (plotlyRelayoutEvent?.["xaxis.autorange"] === true) {
            setVisibleXAxisRange(null);
            return;
          }
          const visibleXAxisMin = Number(plotlyRelayoutEvent?.["xaxis.range[0]"]);
          const visibleXAxisMax = Number(plotlyRelayoutEvent?.["xaxis.range[1]"]);
          if (Number.isFinite(visibleXAxisMin) && Number.isFinite(visibleXAxisMax)) {
            setVisibleXAxisRange([visibleXAxisMin, visibleXAxisMax]);
          }
        },
      },
    ],
  });
  return <div className={styles.timeSeriesChart} ref={timeSeriesChartContainerRef} />;
}

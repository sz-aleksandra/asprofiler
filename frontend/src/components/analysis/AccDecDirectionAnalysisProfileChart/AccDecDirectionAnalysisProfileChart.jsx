import { useRef } from "react";

import usePlotlyChart from "../../../hooks/analysis/usePlotlyChart";
import {
  buildAccDecDirectionAnalysisProfileChartLayout,
  buildAccDecDirectionAnalysisProfileChartData,
  getChosenAnalysisPointsFromPlotlyEvent,
} from "../../../utils/analysis/charts/accDecDirectionAnalysisProfileChart";

import styles from "./AccDecDirectionAnalysisProfileChart.module.css";
export default function AccDecDirectionAnalysisProfileChart({
  accDecDirectionAnalysisProfiles,
  colorMap,
  accDecDirectionMultiplier,
  analysisProfileConfig,
  chosenAnalysisPointsState: {
    chosenAnalysisPoints,
    beforeChosenAnalysisPointsCount,
    afterChosenAnalysisPointsCount,
    onChooseAnalysisPoint,
    onChooseAnalysisPoints,
  },
  accDecDirectionAnalysisProfileChartTitle,
  accDecDirectionAnalysisProfileChartYAxisTitle,
}) {
  const accDecDirectionAnalysisProfileChartContainerRef = useRef(null);
  const {
    accDecDirectionAnalysisProfileTraces,
    accDecDirectionAnalysisProfileShapes,
    globalMinSpeed,
    globalMaxSpeed,
    globalMaxMetricValue,
  } = buildAccDecDirectionAnalysisProfileChartData({
    accDecDirectionAnalysisProfiles,
    colorMap,
    accDecDirectionMultiplier,
    analysisProfileConfig,
    chosenAnalysisPoints,
    beforeChosenAnalysisPointsCount,
    afterChosenAnalysisPointsCount,
  });
  usePlotlyChart({
    chartContainerRef: accDecDirectionAnalysisProfileChartContainerRef,
    plotlyTraces: accDecDirectionAnalysisProfileTraces,
    plotlyLayout: buildAccDecDirectionAnalysisProfileChartLayout({
      accDecDirectionAnalysisProfileChartTitle,
      accDecDirectionAnalysisProfileChartYAxisTitle,
      accDecDirectionAnalysisProfileShapes,
      globalMinSpeed,
      globalMaxSpeed,
      globalMaxMetricValue,
    }),
    isPlotlyChartEnabled: true,
    plotlyEvents: [
      {
        name: "plotly_click",
        handler: (plotlyClickEvent) => {
          const [accDecDirectionAnalysisProfilePointToChoose] =
            getChosenAnalysisPointsFromPlotlyEvent(plotlyClickEvent);
          if (accDecDirectionAnalysisProfilePointToChoose) {
            onChooseAnalysisPoint(accDecDirectionAnalysisProfilePointToChoose);
          }
        },
      },
      {
        name: "plotly_selected",
        handler: (plotlySelectedEvent) => {
          const accDecDirectionAnalysisProfilePointsToChoose =
            getChosenAnalysisPointsFromPlotlyEvent(plotlySelectedEvent);
          if (accDecDirectionAnalysisProfilePointsToChoose.length) {
            onChooseAnalysisPoints(accDecDirectionAnalysisProfilePointsToChoose);
          }
        },
      },
    ],
  });
  return (
    <div
      className={styles.accDecDirectionAnalysisProfileChart}
      ref={accDecDirectionAnalysisProfileChartContainerRef}
    />
  );
}

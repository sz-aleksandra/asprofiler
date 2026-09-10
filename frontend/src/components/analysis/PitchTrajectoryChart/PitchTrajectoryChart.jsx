import { useRef } from "react";

import usePlotlyChart from "../../../hooks/analysis/usePlotlyChart";
import {
  buildPitchTrajectoryPointSeries,
  buildPitchTrajectoryChartLayout,
  buildPitchTrajectoryChartTraces,
} from "../../../utils/analysis/charts/pitchTrajectoryChart";

import styles from "./PitchTrajectoryChart.module.css";
export default function PitchTrajectoryChart({
  visibleAnalysisResults,
  colorMap,
  chosenAnalysisPointsState: {
    chosenAnalysisPoints,
    beforeChosenAnalysisPointsCount,
    afterChosenAnalysisPointsCount,
  },
  formatAnalysisTimeLabel,
  analysisProfileConfig,
}) {
  const pitchTrajectoryChartContainerRef = useRef(null);
  const pitchTrajectoryPointSeriesList = visibleAnalysisResults.map((analysisResult) =>
    buildPitchTrajectoryPointSeries(analysisResult),
  );
  const chartTraces = pitchTrajectoryPointSeriesList.length
    ? buildPitchTrajectoryChartTraces({
        pitchTrajectoryPointSeriesList,
        colorMap,
        chosenAnalysisPoints,
        beforeChosenAnalysisPointsCount,
        afterChosenAnalysisPointsCount,
        formatAnalysisTimeLabel,
        analysisProfileConfig,
      })
    : null;
  usePlotlyChart({
    chartContainerRef: pitchTrajectoryChartContainerRef,
    plotlyTraces: chartTraces,
    plotlyLayout: buildPitchTrajectoryChartLayout(),
    isPlotlyChartEnabled: !!chartTraces,
  });
  return <div className={styles.pitchTrajectoryChart} ref={pitchTrajectoryChartContainerRef} />;
}

import { useRef } from "react";

import usePlotlyChart from "../../../hooks/analysis/usePlotlyChart";
import {
  buildDistributionChartLayout,
  buildDistributionChartTraces,
} from "../../../utils/analysis/charts/distributionChart";

import styles from "./DistributionChart.module.css";
export default function DistributionChart({
  distributionChartTraces,
  distributionChartTitle,
  distributionChartXAxis,
  distributionChartYAxis,
}) {
  const distributionChartContainerRef = useRef(null);
  const builtDistributionChartTraces = buildDistributionChartTraces(distributionChartTraces);
  const builtDistributionChartLayout = buildDistributionChartLayout({
    distributionChartTitle,
    distributionChartXAxis,
    distributionChartYAxis,
  });
  const hasDistributionChartTraces = builtDistributionChartTraces.length > 0;
  usePlotlyChart({
    chartContainerRef: distributionChartContainerRef,
    plotlyTraces: builtDistributionChartTraces,
    plotlyLayout: builtDistributionChartLayout,
    isPlotlyChartEnabled: hasDistributionChartTraces,
  });
  return <div className={styles.distributionChart} ref={distributionChartContainerRef} />;
}

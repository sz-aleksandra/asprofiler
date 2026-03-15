import { useEffect, useMemo, useRef } from "react";
import Plotly from "plotly.js-dist-min";

import styles from "./DistributionChart.module.css";
import { getCssVar } from "../../utils/getCssVar";
import { hexToRgba } from "../../utils/hexToRgba";

export default function DistributionChart({
  title,
  traces,
  showLegend = true,
  violinMode = false,
  xAxis,
  yAxis,
}) {
  const containerRef = useRef(null);
  const cssBlack = getCssVar("--black");

  const plotData = useMemo(() => {
    if (!Array.isArray(traces) || !traces.length) return null;

    const normalized = traces.filter(Boolean).map((trace) => {
      if (trace.type === "violin") {
        const baseColor = trace.line.color;
        return {
          ...trace,
          line: {
            width: 1.5,
            color: baseColor,
            ...(trace.line || {}),
          },
        };
      }
      return trace;
    });

    return normalized.length ? normalized : null;
  }, [traces]);

  useEffect(() => {
    if (!containerRef.current || !plotData) return undefined;

    const node = containerRef.current;
    const heatmapTrace = plotData.find((trace) => trace.type === "heatmap");
    const colorAxis = heatmapTrace
      ? {
          cmin: Number.isFinite(Number(heatmapTrace.zmin)) ? Number(heatmapTrace.zmin) : 0,
          cmax: Number.isFinite(Number(heatmapTrace.zmax)) ? Number(heatmapTrace.zmax) : 1,
          colorscale: [
            [0, "#ffffff"],
            [0.12, hexToRgba(heatmapTrace.baseColor, 0.18)],
            [0.3, hexToRgba(heatmapTrace.baseColor, 0.35)],
            [0.6, hexToRgba(heatmapTrace.baseColor, 0.65)],
            [1, heatmapTrace.baseColor],
          ],
          colorbar: {
            title: { text: "Count" },
          },
        }
      : undefined;
    const layout = {
      title: { text: title, font: { color: cssBlack } },
      font: { color: cssBlack },
      showlegend: showLegend,
      violinmode: violinMode ? "group" : undefined,
      xaxis: xAxis,
      yaxis: yAxis,
      legend: {
        orientation: "h",
        font: { color: cssBlack },
      },
      coloraxis: colorAxis,
    };

    const config = { responsive: true };

    Plotly.react(node, plotData, layout, config);

    const ro = new ResizeObserver(() => Plotly.Plots.resize(node));
    ro.observe(node);
    return () => ro.disconnect();
  }, [plotData, title, cssBlack, showLegend, violinMode, xAxis, yAxis]);

  if (!plotData) return null;

  return <div className={styles.chart} ref={containerRef} />;
}

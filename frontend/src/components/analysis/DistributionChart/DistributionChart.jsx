import { useMemo, useRef } from "react";

import usePlotlyChart from "../../../hooks/analysis/usePlotlyChart";
import styles from "./DistributionChart.module.css";
import { getCssVar } from "../../../utils/shared/getCssVar";
import { hexToRgba } from "../../../utils/shared/hexToRgba";

export default function DistributionChart({
  title,
  traces,
  showLegend = true,
  violinMode = false,
  barMode,
  barGap,
  barGroupGap,
  xAxis,
  yAxis,
}) {
  const containerRef = useRef(null);
  const cssBlack = getCssVar("--black");
  const cssRed = getCssVar("--red");

  const plotData = useMemo(() => {
    if (!Array.isArray(traces) || !traces.length) return null;

    const normalized = traces.filter(Boolean).map((trace) => {
      if (trace.type === "violin") {
        const baseColor = trace.line?.color;
        return {
          ...trace,
          line: {
            width: 2,
            color: baseColor,
            ...(trace.line || {}),
          },
          fillcolor: trace.fillcolor || "rgba(0,0,0,0)",
        };
      }
      if (trace.type === "histogram" || trace.type === "bar") {
        const baseColor = trace.marker?.color || trace.line?.color;
        return {
          ...trace,
          opacity: trace.opacity ?? 0.3,
          marker: {
            color: trace.marker?.color || baseColor,
            line: {
              width: 2,
              color: baseColor,
            },
            ...(trace.marker || {}),
          },
        };
      }
      return trace;
    });

    return normalized.length ? normalized : null;
  }, [traces]);

  const layout = useMemo(() => {
    if (!plotData) return null;
    const heatmapTrace = plotData.find((trace) => trace.type === "heatmap");
    const colorAxis = heatmapTrace
      ? {
          cmin: Number.isFinite(Number(heatmapTrace.zmin)) ? Number(heatmapTrace.zmin) : 0,
          cmax: Number.isFinite(Number(heatmapTrace.zmax)) ? Number(heatmapTrace.zmax) : 1,
          colorscale: [
            [0, "#ffffff"],
            [0.12, hexToRgba(cssRed, 0.18)],
            [0.3, hexToRgba(cssRed, 0.35)],
            [0.6, hexToRgba(cssRed, 0.65)],
            [1, cssRed],
          ],
          colorbar: {
            title: { text: "Count" },
          },
        }
      : undefined;
    return {
      title: { text: title, font: { color: cssBlack } },
      font: { color: cssBlack },
      uirevision: title,
      margin: { l: 50, r: 20, t: 40, b: 80 },
      showlegend: showLegend,
      violinmode:
        violinMode === true ? "group" : typeof violinMode === "string" ? violinMode : undefined,
      barmode: barMode,
      bargap: barGap,
      bargroupgap: barGroupGap,
      xaxis: xAxis,
      yaxis: yAxis,
      legend: {
        orientation: "h",
        x: 0,
        y: -0.22,
        xanchor: "left",
        yanchor: "top",
        font: { color: cssBlack },
      },
      coloraxis: colorAxis,
    };
  }, [
    plotData,
    title,
    cssBlack,
    cssRed,
    showLegend,
    violinMode,
    barMode,
    barGap,
    barGroupGap,
    xAxis,
    yAxis,
  ]);

  const config = useMemo(() => ({ responsive: true, displayModeBar: true }), []);
  usePlotlyChart({ containerRef, traces: plotData, layout, config, enabled: Boolean(plotData) });

  if (!plotData) return null;

  return <div className={styles.chart} ref={containerRef} />;
}

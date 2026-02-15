import { useEffect, useMemo, useRef } from "react";
import Plotly from "plotly.js-dist-min";

import styles from "./TimeSeriesChart.module.css";

export default function TimeSeriesChart({
  title,
  time,
  series,
  xTitle = "Time series",
  selectedPoints,
  pointWindow,
  timeWindowSec,
}) {
  const containerRef = useRef(null);

  const plotData = useMemo(() => {
    if (!series?.length) return null;
    const next = series
      .filter((s) => {
        const x = s.x || time;
        return x?.length && s.values?.length;
      })
      .map((s) => {
        return {
          name: s.name,
          type: "scattergl",
          mode: "lines",
          x: s.x || time,
          y: s.values,
          line: { color: s.color || undefined, width: 1.5 },
        };
      });
    if (!next.length) return null;

    const selections = (selectedPoints || []).filter(
      (p) => p?.name && Number.isInteger(Number(p?.index)),
    );
    const shapes = [];
    if (selections.length > 0) {
      selections.forEach((sel) => {
        const selectedName = sel.name;
        const selectedIndex = Number(sel.index);
        const target = series.find((s) => s.name === selectedName);
        const xData = target?.x || time;
        const yData = target?.values;
        if (!xData?.length || !yData?.length || selectedIndex < 0 || selectedIndex >= xData.length) {
          return;
        }
        const centerTime = Number(xData[selectedIndex]);
        if (Number.isFinite(centerTime)) {
          const windowFrom = centerTime - timeWindowSec;
          const windowTo = centerTime + timeWindowSec;
          shapes.push(
            {
              type: "rect",
              xref: "x",
              yref: "paper",
              x0: windowFrom,
              x1: windowTo,
              y0: 0,
              y1: 1,
              fillcolor: "rgba(0, 1, 35, 0.08)",
              line: { width: 0 },
              layer: "below",
            },
            {
              type: "line",
              xref: "x",
              yref: "paper",
              x0: centerTime,
              x1: centerTime,
              y0: 0,
              y1: 1,
              line: { color: "rgba(0, 1, 35, 0.65)", width: 2 },
            },
          );
        }

        const pFrom = Math.max(0, selectedIndex - pointWindow);
        const pTo = Math.min(xData.length - 1, selectedIndex + pointWindow);
        const xWindow = xData.slice(pFrom, pTo + 1);
        const yWindow = yData.slice(pFrom, pTo + 1);
        if (xWindow.length > 1) {
          next.push({
            name: `${selectedName} context`,
            type: "scatter",
            mode: "lines+markers",
            x: xWindow,
            y: yWindow,
            line: { color: target?.color || "#000123", width: 3 },
            marker: { size: 7, color: target?.color || "#000123" },
            showlegend: false,
          });
        }
        next.push({
          name: `${selectedName} selected`,
          type: "scatter",
          mode: "markers",
          x: [xData[selectedIndex]],
          y: [yData[selectedIndex]],
          marker: {
            size: 11,
            color: target?.color || "#000123",
            line: { color: "#ffffff", width: 2 },
          },
          showlegend: false,
        });
      });
    }

    return { traces: next, shapes };
  }, [time, series, selectedPoints, pointWindow, timeWindowSec]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const node = containerRef.current;
    if (!plotData) return undefined;
    const cssBlack =
      getComputedStyle(document.documentElement).getPropertyValue("--black").trim() || "#000123";

    const layout = {
      title: { text: title, font: { color: cssBlack } },
      font: { color: cssBlack },
      margin: { l: 50, r: 20, t: 40, b: 110 },
      xaxis: {
        title: { text: xTitle, font: { color: cssBlack } },
        tickfont: { color: cssBlack },
        type: "linear",
      },
      yaxis: {
        title: { text: title, font: { color: cssBlack } },
        tickfont: { color: cssBlack },
      },
      shapes: plotData.shapes,
      showlegend: true,
      legend: {
        orientation: "h",
        x: 0,
        y: -0.22,
        xanchor: "left",
        yanchor: "top",
        font: { color: cssBlack },
      },
    };

    const config = {
      responsive: true,
      displayModeBar: true,
    };
    Plotly.react(node, plotData.traces, layout, config);

    const ro = new ResizeObserver(() => Plotly.Plots.resize(node));
    ro.observe(node);
    return () => ro.disconnect();
  }, [plotData, title, xTitle]);

  if (!plotData) return null;

  return <div className={styles.chart} ref={containerRef} />;
}

import { useEffect, useMemo, useRef } from "react";
import Plotly from "plotly.js-dist-min";

import styles from "./TimeSeriesChart.module.css";

export default function TimeSeriesChart({ title, time, series, xTitle = "Time series" }) {
  const containerRef = useRef(null);

  const traces = useMemo(() => {
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
    return next.length ? next : null;
  }, [time, series]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const node = containerRef.current;
    if (!traces) return undefined;

    const layout = {
      title,
      margin: { l: 50, r: 20, t: 40, b: 95 },
      xaxis: { title: xTitle, type: "linear" },
      yaxis: { title: title },
      showlegend: true,
      legend: {
        orientation: "h",
        x: 0,
        y: -0.35,
        xanchor: "left",
        yanchor: "top",
      },
    };

    const config = {
      responsive: true,
      displayModeBar: true,
    };
    Plotly.react(node, traces, layout, config);

    const ro = new ResizeObserver(() => Plotly.Plots.resize(node));
    ro.observe(node);
    return () => ro.disconnect();
  }, [traces, title, xTitle]);

  if (!traces) return null;

  return <div className={styles.chart} ref={containerRef} />;
}

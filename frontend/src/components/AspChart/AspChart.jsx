import { useEffect, useMemo, useRef } from "react";
import Plotly from "plotly.js-dist-min";

import styles from "./AspChart.module.css";
import { hexToRgba } from "../../utils/hexToRgba";

export default function AspChart({ profile, title = "ASP Chart" }) {
  const containerRef = useRef(null);

  const chartData = useMemo(() => {
    if (!profile?.points?.length || !profile?.fit) return null;

    const cutoff = Number(profile?.meta?.min_speed ?? 0);
    const all = profile.all_points || [];
    const sortedAll = [...all].sort((a, b) => a.speed - b.speed);

    const included = sortedAll.filter((p) => p.speed >= cutoff);
    const rejected = sortedAll.filter((p) => p.speed < cutoff);

    const selected = profile.points || [];

    const color = "#000123";
    const traces = [
      {
        name: "Rejected (< cutoff)",
        type: "scattergl",
        mode: "markers",
        x: rejected.map((p) => p.speed),
        y: rejected.map((p) => p.accel),
        marker: { size: 4, color: hexToRgba(color, 0.2) },
      },
      {
        name: "Included (>= cutoff)",
        type: "scattergl",
        mode: "markers",
        x: included.map((p) => p.speed),
        y: included.map((p) => p.accel),
        marker: { size: 4, color: hexToRgba(color, 0.4) },
      },
      {
        name: "Points",
        type: "scattergl",
        mode: "markers",
        x: selected.map((p) => p.speed),
        y: selected.map((p) => p.accel),
        marker: { size: 7, color: hexToRgba(color, 0.9) },
      },
    ];

    const minX = sortedAll.length ? sortedAll[0].speed : 0;
    const maxX = sortedAll.length ? sortedAll[sortedAll.length - 1].speed : 1;
    const fitX = [minX, maxX];
    const fitY = fitX.map((x) => profile.fit.A0 + profile.fit.AS_slope * x);
    traces.push({
      name: "Fit",
      type: "scatter",
      mode: "lines",
      x: fitX,
      y: fitY,
      line: { color },
    });

    return traces;
  }, [profile]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const node = containerRef.current;
    if (!chartData) return undefined;

    const layout = {
      title,
      margin: { l: 50, r: 20, t: 40, b: 50 },
      xaxis: { title: "Speed (m/s)" },
      yaxis: { title: "Acceleration" },
      showlegend: true,
      legend: {
        orientation: "h",
        x: 0,
        y: -0.25,
        xanchor: "left",
        yanchor: "top",
      },
    };

    const config = {
      responsive: true,
      displayModeBar: true,
    };
    Plotly.react(node, chartData, layout, config);

    const ro = new ResizeObserver(() => Plotly.Plots.resize(node));
    ro.observe(node);
    return () => ro.disconnect();
  }, [chartData, title]);

  return <div className={styles.chart} ref={containerRef} />;
}

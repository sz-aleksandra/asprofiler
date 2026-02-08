import { useEffect, useMemo, useRef } from "react";
import Plotly from "plotly.js-dist-min";

import styles from "./AspChartCombined.module.css";
import { hexToRgba } from "../../utils/hexToRgba";

function colorFor(index) {
  const black = "#000123";
  const red = "#fe4321";
  return index % 2 === 0 ? black : red;
}

export default function AspChartCombined({ profiles, title = "ASP Chart (Combined)" }) {
  const containerRef = useRef(null);

  const traces = useMemo(() => {
    const valid = (profiles || []).filter((p) => p?.profile?.points?.length && p?.profile?.fit);
    if (!valid.length) return null;

    const allTraces = [];
    valid.forEach((item, index) => {
      const base = colorFor(index);
      const profile = item.profile;
      const cutoff = Number(profile?.meta?.min_speed ?? 0);
      const all = profile.all_points || [];
      const sortedAll = [...all].sort((a, b) => a.speed - b.speed);
      const included = sortedAll.filter((p) => p.speed >= cutoff);
      const rejected = sortedAll.filter((p) => p.speed < cutoff);
      const selected = profile.points || [];

      allTraces.push(
        {
          name: `${item.name} rejected`,
          type: "scattergl",
          mode: "markers",
          x: rejected.map((p) => p.speed),
          y: rejected.map((p) => p.accel),
          marker: { size: 4, color: hexToRgba(base, 0.2) },
        },
        {
          name: `${item.name} included`,
          type: "scattergl",
          mode: "markers",
          x: included.map((p) => p.speed),
          y: included.map((p) => p.accel),
          marker: { size: 4, color: hexToRgba(base, 0.4) },
        },
        {
          name: `${item.name} points`,
          type: "scattergl",
          mode: "markers",
          x: selected.map((p) => p.speed),
          y: selected.map((p) => p.accel),
          marker: { size: 7, color: hexToRgba(base, 0.9) },
        },
      );

      if (sortedAll.length) {
        const minX = sortedAll[0].speed;
        const maxX = sortedAll[sortedAll.length - 1].speed;
        const fitX = [minX, maxX];
        const fitY = fitX.map((x) => profile.fit.A0 + profile.fit.AS_slope * x);
        allTraces.push({
          name: `${item.name} fit`,
          type: "scatter",
          mode: "lines",
          x: fitX,
          y: fitY,
          line: { color: base, width: 2 },
        });
      }
    });

    return allTraces;
  }, [profiles]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const node = containerRef.current;
    if (!traces) return undefined;

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
    Plotly.react(node, traces, layout, config);

    const ro = new ResizeObserver(() => Plotly.Plots.resize(node));
    ro.observe(node);
    return () => ro.disconnect();
  }, [traces, title]);

  return <div className={styles.chart} ref={containerRef} />;
}

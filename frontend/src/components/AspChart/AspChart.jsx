import { useEffect, useMemo, useRef } from "react";
import Plotly from "plotly.js-dist-min";

import styles from "./AspChart.module.css";
import { hexToRgba } from "../../utils/hexToRgba";

export default function AspChart({
  profiles,
  title = "ASP Chart",
  colorMap,
  defaultColor,
  hiddenMap,
}) {
  const containerRef = useRef(null);

  const data = useMemo(() => {
    const valid = (profiles || [])
      .filter((p) => p?.profile?.points?.length && p?.profile?.fit)
      .filter((p) => !hiddenMap?.[p.name]);
    if (!valid.length) return null;

    const allTraces = [];
    const shapes = [];
    const globalMinSpeed = Math.min(
      ...valid.map((v) => Number(v.profile?.meta?.min_speed ?? 0)),
    );
    const globalMaxSpeed = Math.max(
      ...valid.flatMap((v) => (v.profile?.all_points || []).map((p) => p.speed)),
    );

    valid.forEach((item) => {
      const base = colorMap?.[item.name] || defaultColor || null;
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
          marker: { size: 4, color: base ? hexToRgba(base, 0.2) : undefined },
          showlegend: true,
        },
        {
          name: `${item.name} included`,
          type: "scattergl",
          mode: "markers",
          x: included.map((p) => p.speed),
          y: included.map((p) => p.accel),
          marker: { size: 4, color: base ? hexToRgba(base, 0.4) : undefined },
          showlegend: true,
        },
        {
          name: `${item.name} points`,
          type: "scattergl",
          mode: "markers",
          x: selected.map((p) => p.speed),
          y: selected.map((p) => p.accel),
          marker: { size: 7, color: base ? hexToRgba(base, 0.9) : undefined },
          showlegend: true,
        },
      );

      shapes.push({
        type: "line",
        x0: cutoff,
        x1: cutoff,
        y0: 0,
        y1: 1,
        xref: "x",
        yref: "paper",
        line: {
          color: base ? base : "#666",
          width: 1.5,
          dash: "dash",
        },
      });

      if (sortedAll.length) {
        const localMin = sortedAll[0].speed;
        const localMax = sortedAll[sortedAll.length - 1].speed;
        const s0 = Number(profile?.fit?.S0);
        const fitMin = Math.min(
          ...[localMin, 0, Number.isFinite(s0) ? s0 : localMin],
        );
        const fitMax = Math.max(
          ...[localMax, 0, Number.isFinite(s0) ? s0 : localMax],
        );
        const fitX = [fitMin, fitMax];
        const fitY = fitX.map((x) => profile.fit.A0 + profile.fit.AS_slope * x);
        allTraces.push({
          name: `${item.name} fit`,
          type: "scatter",
          mode: "lines",
          x: fitX,
          y: fitY,
          line: base ? { color: base, width: 2 } : { width: 2 },
          showlegend: true,
        });
      }
    });

    return {
      traces: allTraces,
      shapes,
      minSpeed: Number.isFinite(globalMinSpeed) ? globalMinSpeed : 0,
      maxSpeed: Number.isFinite(globalMaxSpeed) ? globalMaxSpeed : 0,
    };
  }, [profiles, colorMap, defaultColor, hiddenMap]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const node = containerRef.current;
    if (!data) return undefined;

    const layout = {
      title,
      margin: { l: 50, r: 20, t: 40, b: 90 },
      xaxis: {
        title: "Speed (m/s)",
        range: [data.minSpeed, data.maxSpeed],
      },
      yaxis: { title: "Acceleration" },
      showlegend: true,
      shapes: data.shapes,
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
    Plotly.react(node, data.traces, layout, config);

    const ro = new ResizeObserver(() => Plotly.Plots.resize(node));
    ro.observe(node);
    return () => {
      ro.disconnect();
    };
  }, [data, title]);

  return <div className={styles.chart} ref={containerRef} />;
}

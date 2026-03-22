import { useEffect, useMemo, useRef } from "react";
import Plotly from "plotly.js-dist-min";

import styles from "./AspChart.module.css";
import { getCssVar } from "../../utils/getCssVar";
import { hexToRgba } from "../../utils/hexToRgba";

export default function AspChart({
  profiles,
  title = "Acceleration Speed Profile",
  colorMap,
  hiddenMap,
  onPointSelect,
  onPointsSelect,
  selectedPoints,
  pointWindow,
}) {
  const containerRef = useRef(null);
  const cssBlack = getCssVar("--black");

  const data = useMemo(() => {
    const valid = (profiles || [])
      .filter((p) => p?.profile?.points?.length && p?.profile?.fit)
      .filter((p) => !hiddenMap?.[p.name]);
    if (!valid.length) return null;

    const allTraces = [];
    const shapes = [];
    const maxSpeedCandidates = valid.flatMap((v) => v.profile?.timeseries?.speed || []);
    const maxAccelCandidates = valid.flatMap((v) => v.profile?.timeseries?.acceleration || []);
    const globalMinSpeed = valid.reduce(
      (min, item) => Math.min(min, Number(item.profile?.meta?.min_speed ?? 0)),
      Number.POSITIVE_INFINITY,
    );
    const globalMaxSpeed = maxSpeedCandidates.reduce(
      (max, value) => Math.max(max, Number(value)),
      Number.NEGATIVE_INFINITY,
    );
    const globalMaxAccel = maxAccelCandidates.reduce(
      (max, value) => Math.max(max, Number(value)),
      Number.NEGATIVE_INFINITY,
    );

    valid.forEach((item) => {
      const base = colorMap?.[item.name];
      const profile = item.profile;
      const cutoff = Number(profile?.meta?.min_speed ?? 0);
      const {
        time: tsTime = [],
        speed: tsSpeed = [],
        acceleration: tsAccel = [],
      } = profile?.timeseries || {};
      const toKey = (speed, accel) => `${Number(speed).toFixed(6)}|${Number(accel).toFixed(6)}`;

      const all = (tsTime || []).map((t, i) => ({
        index: i,
        time: Number(t),
        speed: Number(tsSpeed[i]),
        accel: Number(tsAccel[i]),
      }));

      const sortedAll = [...all].sort((a, b) => a.speed - b.speed);
      const included = sortedAll.filter((p) => p.speed >= cutoff);
      const rejected = sortedAll.filter((p) => p.speed < cutoff);
      const selectedRaw = Array.isArray(profile?.points) ? profile.points : [];
      let selected = selectedRaw;
      if (!selected.every((p) => Number.isInteger(p?.index) && Number.isFinite(Number(p?.time)))) {
        const buckets = new Map();
        all.forEach((p) => {
          const key = toKey(p.speed, p.accel);
          const list = buckets.get(key) || [];
          list.push(p);
          buckets.set(key, list);
        });
        selected = selectedRaw
          .map((p) => {
            const key = toKey(p?.speed, p?.accel);
            const list = buckets.get(key);
            if (list?.length) return list.shift();
            let nearest = null;
            let nearestDist = Number.POSITIVE_INFINITY;
            all.forEach((candidate) => {
              const ds = Number(candidate.speed) - Number(p?.speed);
              const da = Number(candidate.accel) - Number(p?.accel);
              const dist = ds * ds + da * da;
              if (dist < nearestDist) {
                nearestDist = dist;
                nearest = candidate;
              }
            });
            return nearest;
          })
          .filter(Boolean);
      }
      const asCustomData = (point, kind) => [
        item.name,
        Number.isInteger(point.index) ? point.index : -1,
        Number.isFinite(Number(point.time)) ? Number(point.time) : null,
        Number(point.speed),
        Number(point.accel),
        kind,
      ];

      allTraces.push(
        {
          name: `${item.name} rejected`,
          type: "scattergl",
          mode: "markers",
          x: rejected.map((p) => p.speed),
          y: rejected.map((p) => p.accel),
          customdata: rejected.map((p) => asCustomData(p, "rejected")),
          marker: { size: 4, color: base ? hexToRgba(base, 0.2) : undefined },
          showlegend: true,
        },
        {
          name: `${item.name} included`,
          type: "scattergl",
          mode: "markers",
          x: included.map((p) => p.speed),
          y: included.map((p) => p.accel),
          customdata: included.map((p) => asCustomData(p, "included")),
          marker: { size: 4, color: base ? hexToRgba(base, 0.4) : undefined },
          showlegend: true,
        },
        {
          name: `${item.name} points`,
          type: "scattergl",
          mode: "markers",
          x: selected.map((p) => p.speed),
          y: selected.map((p) => p.accel),
          customdata: selected.map((p) => asCustomData(p, "points")),
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
          color: cssBlack,
          width: 1,
          dash: "dash",
        },
      });

      if (sortedAll.length) {
        const fitCurve = profile.fit.curve;
        allTraces.push({
          name: `${item.name} fit`,
          type: "scatter",
          mode: "lines",
          x: fitCurve.map((point) => Number(point.speed)),
          y: fitCurve.map((point) => Number(point.accel)),
          line: { color: base, width: 2 },
          showlegend: true,
        });
      }

      const selectedForFile = (selectedPoints || []).filter(
        (p) => p?.name === item.name && Number.isInteger(Number(p?.index)),
      );
        if (selectedForFile.length > 0 && all.length > 0) {
          const byIndex = [...all].sort((a, b) => a.index - b.index);
          const selectedIndexSet = new Set(selectedForFile.map((p) => Number(p.index)));
          const centers = [];
        selectedForFile.forEach((sel) => {
          const selectedIndex = Number(sel.index);
          const rangeFrom = selectedIndex - pointWindow;
          const rangeTo = selectedIndex + pointWindow;
          const windowPoints = byIndex.filter((p) => p.index >= rangeFrom && p.index <= rangeTo);
          if (windowPoints.length > 1) {
            const markerSizes = windowPoints.map((p) => (selectedIndexSet.has(p.index) ? 0 : 4));
            allTraces.push({
              name: `${item.name} context`,
              type: "scatter",
              mode: "lines+markers",
              x: windowPoints.map((p) => p.speed),
              y: windowPoints.map((p) => p.accel),
              customdata: windowPoints.map((p) => asCustomData(p, "context")),
              line: {
                color: base,
                width: 1.5,
              },
              marker: {
                size: markerSizes,
                color: base,
              },
              showlegend: false,
            });
          }
          const center = byIndex.find((p) => p.index === selectedIndex);
          if (center) centers.push(center);
        });
        if (centers.length > 0) {
          const ordered = [...centers].sort((a, b) => a.index - b.index);
          allTraces.push({
            name: `${item.name} selected`,
            type: "scatter",
            mode: "markers",
            x: ordered.map((p) => p.speed),
            y: ordered.map((p) => p.accel),
            customdata: ordered.map((p) => asCustomData(p, "selected")),
            marker: {
              size: 7,
              color: base,
              symbol: "diamond",
            },
            showlegend: false,
          });
        }
      }
    });

    return {
      traces: allTraces,
      shapes,
      minSpeed: Number.isFinite(globalMinSpeed) ? globalMinSpeed : 0,
      maxSpeed: Number.isFinite(globalMaxSpeed) ? globalMaxSpeed : 0,
      maxAccel: Number.isFinite(globalMaxAccel) ? globalMaxAccel : 0,
    };
  }, [profiles, colorMap, hiddenMap, selectedPoints, pointWindow]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const node = containerRef.current;
    if (!data) return undefined;
    const layout = {
      title: { text: title, font: { color: cssBlack } },
      font: { color: cssBlack },
      uirevision: title,
      margin: { l: 50, r: 20, t: 40, b: 110 },
      xaxis: {
        title: { text: "Speed (m/s)", font: { color: cssBlack } },
        tickfont: { color: cssBlack },
        range: [data.minSpeed, data.maxSpeed],
      },
      yaxis: {
        title: { text: "Acceleration", font: { color: cssBlack } },
        tickfont: { color: cssBlack },
        range: [0, Math.max(0, data.maxAccel)],
      },
      showlegend: true,
      shapes: [
        ...data.shapes,
        {
          type: "line",
          x0: 0,
          x1: 1,
          y0: 0,
          y1: 0,
          xref: "paper",
          yref: "y",
          line: {
            color: cssBlack,
            width: 1,
            dash: "dash",
          },
        },
      ],
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
    Plotly.react(node, data.traces, layout, config);
    const onClick = (event) => {
      if (!onPointSelect) return;
      const hit = event?.points?.[0];
      const custom = hit?.customdata;
      if (!Array.isArray(custom) || custom.length < 5) return;
      onPointSelect({
        name: custom[0],
        index: Number(custom[1]),
        time: custom[2] === null ? null : Number(custom[2]),
        speed: Number(custom[3]),
        accel: Number(custom[4]),
        kind: custom[5] || "point",
      });
    };
    const onSelected = (event) => {
      if (!onPointsSelect) return;
      const hits = Array.isArray(event?.points) ? event.points : [];
      if (!hits.length) return;
      const points = hits
        .map((h) => h?.customdata)
        .filter((c) => Array.isArray(c) && c.length >= 5)
        .map((c) => ({
          name: c[0],
          index: Number(c[1]),
          time: c[2] === null ? null : Number(c[2]),
          speed: Number(c[3]),
          accel: Number(c[4]),
          kind: c[5] || "point",
        }));
      if (points.length) onPointsSelect(points);
    };
    node.on("plotly_click", onClick);
    node.on("plotly_selected", onSelected);

    const ro = new ResizeObserver(() => Plotly.Plots.resize(node));
    ro.observe(node);
    return () => {
      if (typeof node.removeListener === "function") {
        node.removeListener("plotly_click", onClick);
        node.removeListener("plotly_selected", onSelected);
      }
      ro.disconnect();
    };
  }, [data, title, onPointSelect, onPointsSelect]);

  return <div className={styles.chart} ref={containerRef} />;
}

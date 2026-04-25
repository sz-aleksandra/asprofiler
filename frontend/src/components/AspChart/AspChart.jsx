import { useEffect, useMemo, useRef } from "react";
import Plotly from "plotly.js-dist-min";

import styles from "./AspChart.module.css";
import { getCssVar } from "../../utils/getCssVar";
import { hexToRgba } from "../../utils/hexToRgba";

function getContextWindowPoints(allPoints, selectedIndex, pointsBefore, pointsAfter) {
  const rangeFrom = selectedIndex - pointsBefore;
  const rangeTo = selectedIndex + pointsAfter;
  return allPoints.filter((point) => point.index >= rangeFrom && point.index <= rangeTo);
}

function buildContextTrace(itemName, windowPoints, selectedIndexSet, base, formatSpeed, asCustomData) {
  const markerSizes = windowPoints.map((point) => (selectedIndexSet.has(point.index) ? 0 : 4));
  return {
    name: `${itemName} context`,
    type: "scatter",
    mode: "lines+markers",
    x: windowPoints.map((point) => formatSpeed(point.speed)),
    y: windowPoints.map((point) => point.accel),
    customdata: windowPoints.map((point) => asCustomData(point, "context")),
    line: {
      color: base,
      width: 1.5,
    },
    marker: {
      size: markerSizes,
      color: base,
    },
    showlegend: false,
  };
}

function buildSelectedTrace(itemName, points, base, formatSpeed, asCustomData) {
  return {
    name: `${itemName} selected`,
    type: "scatter",
    mode: "markers",
    x: points.map((point) => formatSpeed(point.speed)),
    y: points.map((point) => point.accel),
    customdata: points.map((point) => asCustomData(point, "selected")),
    marker: {
      size: 7,
      color: base,
      symbol: "diamond",
    },
    showlegend: false,
  };
}

export default function AspChart({
  profiles,
  title = "Acceleration Speed Profile",
  yAxisTitle = "Acceleration (m/s²)",
  plotMultiplier = 1,
  colorMap,
  hiddenMap,
  formatSpeed = (value) => value,
  speedUnitLabel = "m/s",
  onPointSelect,
  onPointsSelect,
  selectedPoints,
  pointsBefore = 10,
  pointsAfter = 10,
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
    const maxSpeedCandidates = valid.flatMap((v) => v.timeseries?.speed || []);
    const maxAccelCandidates = [];
    const globalMinSpeed = valid.reduce(
      (min, item) => Math.min(min, Number(item.profile?.meta?.min_speed ?? 0)),
      Number.POSITIVE_INFINITY,
    );
    const globalMaxSpeed = maxSpeedCandidates.reduce(
      (max, value) => Math.max(max, Number(value)),
      Number.NEGATIVE_INFINITY,
    );

    valid.forEach((item) => {
      const base = colorMap?.[item.name];
      const profile = item.profile;
      const timeseries = item.timeseries;
      const cutoff = Number(profile?.meta?.min_speed ?? 0);
      const multiplier = plotMultiplier;
      const {
        time: tsTime = [],
        absolute_time: tsAbsoluteTime = [],
        speed: tsSpeed = [],
        acceleration: tsAccel = [],
      } = timeseries || {};

      const all = tsTime
        .map((t, i) => ({
          index: i,
          time: Number(t),
          absoluteTime: tsAbsoluteTime[i] || "",
          speed: Number(tsSpeed[i]),
          accel: Number(tsAccel[i]) * multiplier,
        }));
      all.forEach((point) => {
        maxAccelCandidates.push(point.accel);
      });
      const directionalRaw = [...all]
        .filter((point) => point.accel > 0)
        .sort((a, b) => a.speed - b.speed);
      const filteredDirectional = directionalRaw.filter((point) => point.speed >= cutoff);

      const selected = profile.points.map((p) => ({
        ...p,
        accel: Number(p.accel) * multiplier,
      }));
      const selectedIndexSetForLayers = new Set(
        selected.map((point) => Number(point.index)),
      );
      const rejected = all.filter((point) => point.accel <= 0 || point.speed < cutoff);
      const included = filteredDirectional.filter(
        (point) => !selectedIndexSetForLayers.has(point.index),
      );
      const asCustomData = (point, kind) => [
        item.name,
        point.index,
        point.time,
        point.absoluteTime || "",
        point.speed,
        point.accel,
        kind,
      ];

      allTraces.push(
        {
          name: `${item.name} rejected`,
          type: "scattergl",
          mode: "markers",
          x: rejected.map((p) => formatSpeed(p.speed)),
          y: rejected.map((p) => p.accel),
          customdata: rejected.map((p) => asCustomData(p, "rejected")),
          marker: { size: 4, color: base ? hexToRgba(base, 0.2) : undefined },
          showlegend: true,
        },
        {
          name: `${item.name} included`,
          type: "scattergl",
          mode: "markers",
          x: included.map((p) => formatSpeed(p.speed)),
          y: included.map((p) => p.accel),
          customdata: included.map((p) => asCustomData(p, "included")),
          marker: { size: 4, color: base ? hexToRgba(base, 0.4) : undefined },
          showlegend: true,
        },
        {
          name: `${item.name} points`,
          type: "scattergl",
          mode: "markers",
          x: selected.map((p) => formatSpeed(p.speed)),
          y: selected.map((p) => p.accel),
          customdata: selected.map((p) => asCustomData(p, "points")),
          marker: { size: 7, color: base ? hexToRgba(base, 0.9) : undefined },
          showlegend: true,
        },
      );

      shapes.push({
        type: "line",
        x0: formatSpeed(cutoff),
        x1: formatSpeed(cutoff),
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

      if (profile.fit?.curve?.length) {
        const fitCurve = profile.fit.curve;
        fitCurve.forEach((point) => {
          maxAccelCandidates.push(Number(point.accel) * multiplier);
        });
        allTraces.push({
          name: `${item.name} fit`,
          type: "scatter",
          mode: "lines",
          x: fitCurve.map((point) => formatSpeed(Number(point.speed))),
          y: fitCurve.map((point) => Number(point.accel) * multiplier),
          line: { color: base, width: 2 },
          showlegend: true,
        });
      }

      const selectedForFile = selectedPoints.filter((p) => p.name === item.name);
      if (selectedForFile.length > 0 && all.length > 0) {
        const byIndex = [...all].sort((a, b) => a.index - b.index);
        const selectedIndexSet = new Set(selectedForFile.map((p) => Number(p.index)));
        const centers = [];
        selectedForFile.forEach((sel) => {
          const selectedIndex = Number(sel.index);
          const windowPoints = getContextWindowPoints(
            byIndex,
            selectedIndex,
            pointsBefore,
            pointsAfter,
          );
          if (windowPoints.length > 1) {
            allTraces.push(
              buildContextTrace(
                item.name,
                windowPoints,
                selectedIndexSet,
                base,
                formatSpeed,
                asCustomData,
              ),
            );
          }
          const center = byIndex.find((p) => p.index === selectedIndex);
          if (center) centers.push(center);
        });
        if (centers.length > 0) {
          const ordered = [...centers].sort((a, b) => a.index - b.index);
          allTraces.push(
            buildSelectedTrace(item.name, ordered, base, formatSpeed, asCustomData),
          );
        }
      }
    });

    const globalMaxAccel = maxAccelCandidates.reduce(
      (max, value) => Math.max(max, Number(value)),
      Number.NEGATIVE_INFINITY,
    );

    return {
      traces: allTraces,
      shapes,
      minSpeed: Number.isFinite(globalMinSpeed) ? formatSpeed(globalMinSpeed) : 0,
      maxSpeed: Number.isFinite(globalMaxSpeed) ? formatSpeed(globalMaxSpeed) : 0,
      maxAccel: Number.isFinite(globalMaxAccel) ? globalMaxAccel : 0,
    };
  }, [profiles, plotMultiplier, colorMap, hiddenMap, selectedPoints, pointsBefore, pointsAfter, formatSpeed]);

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
        title: { text: `Speed (${speedUnitLabel})`, font: { color: cssBlack } },
        tickfont: { color: cssBlack },
        range: [data.minSpeed, data.maxSpeed],
      },
      yaxis: {
        title: { text: yAxisTitle, font: { color: cssBlack } },
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
      if (!Array.isArray(custom) || custom.length < 7) return;
      onPointSelect({
        name: custom[0],
        index: Number(custom[1]),
        time: custom[2] === null ? null : Number(custom[2]),
        absoluteTime: custom[3] || "",
        speed: Number(custom[4]),
        accel: Number(custom[5]),
        kind: custom[6] || "point",
      });
    };
    const onSelected = (event) => {
      if (!onPointsSelect) return;
      const hits = Array.isArray(event?.points) ? event.points : [];
      if (!hits.length) return;
      const points = hits
        .map((h) => h?.customdata)
        .filter((c) => Array.isArray(c) && c.length >= 7)
        .map((c) => ({
          name: c[0],
          index: Number(c[1]),
          time: c[2] === null ? null : Number(c[2]),
          absoluteTime: c[3] || "",
          speed: Number(c[4]),
          accel: Number(c[5]),
          kind: c[6] || "point",
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
  }, [data, title, yAxisTitle, onPointSelect, onPointsSelect, speedUnitLabel]);

  return <div className={styles.chart} ref={containerRef} />;
}

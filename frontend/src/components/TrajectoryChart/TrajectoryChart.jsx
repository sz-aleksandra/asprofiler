import { useEffect, useMemo, useRef } from "react";
import Plotly from "plotly.js-dist-min";

import { getCssVar } from "../../utils/getCssVar";
import { hexToRgba } from "../../utils/hexToRgba";
import styles from "./TrajectoryChart.module.css";

const PITCH_LENGTH = 105;
const PITCH_WIDTH = 68;
const EARTH_RADIUS_METERS = 6371000;
const TOUCHLINE_MARGIN = 4;
const X_OFFSET = PITCH_LENGTH / 2;
const KEY_X_TICKS = [0, 16.5, X_OFFSET, PITCH_LENGTH - 16.5, PITCH_LENGTH];
const KEY_Y_TICKS = [-PITCH_WIDTH / 2, -20.16, 0, 20.16, PITCH_WIDTH / 2];

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function prepareTrajectory(item, speedThreshold) {
  const timeseries = item?.profile?.timeseries;
  const speed = Array.isArray(timeseries?.speed) ? timeseries.speed : [];
  const lat = Array.isArray(timeseries?.latitude) ? timeseries.latitude : [];
  const lon = Array.isArray(timeseries?.longitude) ? timeseries.longitude : [];
  const time = Array.isArray(timeseries?.time) ? timeseries.time : [];
  const absoluteTime = Array.isArray(timeseries?.absolute_time) ? timeseries.absolute_time : [];
  const acceleration = Array.isArray(timeseries?.acceleration) ? timeseries.acceleration : [];

  const points = speed
    .map((speedValue, index) => ({
      index,
      time: Number(time[index]),
      absoluteTime: absoluteTime[index] || "",
      speed: Number(speedValue),
      accel: Number(acceleration[index]),
      latitude: Number(lat[index]),
      longitude: Number(lon[index]),
    }))
    .filter(
      (point) =>
        Number.isInteger(point.index) &&
        Number.isFinite(point.time) &&
        Number.isFinite(point.speed) &&
        Number.isFinite(point.accel) &&
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude),
    );

  if (points.length < 2) return null;

  let fastPoints = points.filter((point) => point.speed > speedThreshold);
  if (fastPoints.length < 10) {
    fastPoints = points;
  }

  const lat0 =
    fastPoints.reduce((sum, point) => sum + toRadians(point.latitude), 0) / fastPoints.length;
  const lon0 =
    fastPoints.reduce((sum, point) => sum + toRadians(point.longitude), 0) / fastPoints.length;

  const projected = points.map((point) => {
    const latRad = toRadians(point.latitude);
    const lonRad = toRadians(point.longitude);
    return {
      ...point,
      x: (lonRad - lon0) * Math.cos(lat0) * EARTH_RADIUS_METERS,
      y: (latRad - lat0) * EARTH_RADIUS_METERS,
    };
  });

  let fastProjected = projected.filter((point) => point.speed > speedThreshold);
  if (fastProjected.length < 10) {
    fastProjected = projected;
  }

  const xmin = Math.min(...fastProjected.map((point) => point.x));
  const xmax = Math.max(...fastProjected.map((point) => point.x));
  const ymin = Math.min(...fastProjected.map((point) => point.y));
  const ymax = Math.max(...fastProjected.map((point) => point.y));

  let xShift = 0;
  let yShift = 0;

  if (xmin < -PITCH_LENGTH / 2) xShift += -PITCH_LENGTH / 2 - xmin;
  if (xmax + xShift > PITCH_LENGTH / 2) xShift += PITCH_LENGTH / 2 - (xmax + xShift);
  if (ymin < -PITCH_WIDTH / 2) yShift += -PITCH_WIDTH / 2 - ymin;
  if (ymax + yShift > PITCH_WIDTH / 2) yShift += PITCH_WIDTH / 2 - (ymax + yShift);

  return projected.map((point) => ({
    ...point,
    name: item.name,
    x: point.x + xShift,
    y: point.y + yShift,
  }));
}

function buildPitchShapes(cssBlack) {
  return [
    {
      type: "rect",
      x0: 0,
      x1: PITCH_LENGTH,
      y0: -PITCH_WIDTH / 2,
      y1: PITCH_WIDTH / 2,
      line: { color: cssBlack, width: 2 },
    },
    {
      type: "line",
      x0: X_OFFSET,
      x1: X_OFFSET,
      y0: -PITCH_WIDTH / 2,
      y1: PITCH_WIDTH / 2,
      line: { color: cssBlack, width: 1.5 },
    },
    {
      type: "circle",
      x0: X_OFFSET - 9.15,
      x1: X_OFFSET + 9.15,
      y0: -9.15,
      y1: 9.15,
      line: { color: cssBlack, width: 1.5 },
    },
    {
      type: "rect",
      x0: 0,
      x1: 16.5,
      y0: -20.16,
      y1: 20.16,
      line: { color: cssBlack, width: 1.5 },
    },
    {
      type: "rect",
      x0: PITCH_LENGTH - 16.5,
      x1: PITCH_LENGTH,
      y0: -20.16,
      y1: 20.16,
      line: { color: cssBlack, width: 1.5 },
    },
  ];
}

export default function TrajectoryChart({
  profiles,
  colorMap,
  selectedPoints,
  pointsBefore = 10,
  pointsAfter = 10,
}) {
  const containerRef = useRef(null);
  const cssBlack = getCssVar("--black");

  const data = useMemo(
    () =>
      (profiles || [])
        .map((item) => prepareTrajectory(item, Number(item?.profile?.meta?.min_speed) || 3))
        .filter(Boolean),
    [profiles],
  );

  useEffect(() => {
    if (!containerRef.current || !data.length) return undefined;

    const node = containerRef.current;
    const traces = [];

    data.forEach((series) => {
      const fileName = series[0]?.name;
      const baseColor = colorMap?.[fileName] || "#1f77b4";

      traces.push({
        type: "scatter",
        mode: "lines",
        x: series.map((point) => point.x + X_OFFSET),
        y: series.map((point) => point.y),
        line: { color: hexToRgba(baseColor, 0.75), width: 2 },
        name: fileName,
        customdata: series.map((point) => [
          point.name,
          point.index,
          point.time,
          point.absoluteTime,
          point.speed,
          point.accel,
        ]),
        hovertemplate:
          "%{fullData.name}<br>Time: %{customdata[2]:.1f} s<br>X: %{x:.2f} m<br>Y: %{y:.2f} m<br>Speed: %{customdata[4]:.3f} m/s<br>Acceleration: %{customdata[5]:.3f} m/s²<extra></extra>",
      });
    });

    const selectedByFile = new Map();
    (selectedPoints || []).forEach((point) => {
      if (!point?.name || !Number.isInteger(Number(point?.index))) return;
      const list = selectedByFile.get(point.name) || [];
      list.push({
        index: Number(point.index),
        rawTime: Number(point.rawTime ?? point.time),
      });
      selectedByFile.set(point.name, list);
    });

    data.forEach((series) => {
      const fileName = series[0]?.name;
      const selectedForFile = selectedByFile.get(fileName) || [];
      if (!selectedForFile.length) return;

      const baseColor = colorMap?.[fileName] || "#1f77b4";
      const byIndex = [...series].sort((a, b) => a.index - b.index);
      const pointDots = [];
      const centerPoints = [];

      selectedForFile.forEach((selectedPoint) => {
        const center = byIndex.find((point) => point.index === selectedPoint.index);
        if (!center) return;
        centerPoints.push(center);

        const indexFrom = selectedPoint.index - pointsBefore;
        const indexTo = selectedPoint.index + pointsAfter;
        byIndex.forEach((point) => {
          if (point.index >= indexFrom && point.index <= indexTo) {
            pointDots.push(point);
          }
        });
      });

      const uniqueByIndex = (points) =>
        [...new Map(points.map((point) => [point.index, point])).values()].sort(
          (a, b) => a.index - b.index,
        );

      const dotPoints = uniqueByIndex(pointDots);
      const centers = uniqueByIndex(centerPoints);

      if (dotPoints.length) {
        traces.push({
          type: "scatter",
          mode: "markers",
          x: dotPoints.map((point) => point.x + X_OFFSET),
          y: dotPoints.map((point) => point.y),
          customdata: dotPoints.map((point) => [point.time, point.speed, point.accel]),
          marker: {
            size: 7,
            color: baseColor,
            opacity: 0.85,
          },
          name: `${fileName} selected points`,
          hovertemplate:
            `${fileName}<br>Time: %{customdata[0]:.1f} s<br>X: %{x:.2f} m<br>Y: %{y:.2f} m<br>Speed: %{customdata[1]:.3f} m/s<br>Acceleration: %{customdata[2]:.3f} m/s²<extra></extra>`,
          showlegend: false,
        });
      }

      if (centers.length) {
        traces.push({
          type: "scatter",
          mode: "markers",
          x: centers.map((point) => point.x + X_OFFSET),
          y: centers.map((point) => point.y),
          customdata: centers.map((point) => [point.time, point.speed, point.accel]),
          marker: {
            size: 11,
            symbol: "diamond",
            color: centers.map((point) => colorMap?.[point.name] || "#1f77b4"),
            line: { width: 0 },
          },
          name: `${fileName} selected center`,
          hovertemplate:
            `${fileName}<br>Time: %{customdata[0]:.1f} s<br>X: %{x:.2f} m<br>Y: %{y:.2f} m<br>Speed: %{customdata[1]:.3f} m/s<br>Acceleration: %{customdata[2]:.3f} m/s²<extra></extra>`,
          showlegend: false,
        });
      }
    });

    const layout = {
      title: { text: "Player Trajectory", font: { color: cssBlack } },
      font: { color: cssBlack },
      uirevision: "trajectory",
      paper_bgcolor: "white",
      plot_bgcolor: "white",
      margin: { l: 56, r: 16, t: 40, b: 54 },
      xaxis: {
        title: { text: "X [m]", font: { color: cssBlack } },
        range: [-TOUCHLINE_MARGIN, PITCH_LENGTH + TOUCHLINE_MARGIN],
        tickmode: "array",
        tickvals: KEY_X_TICKS,
        ticktext: KEY_X_TICKS.map((value) => String(value)),
        showgrid: true,
        gridcolor: "rgba(0,0,0,0.12)",
        zeroline: false,
      },
      yaxis: {
        title: { text: "Y [m]", font: { color: cssBlack } },
        range: [-PITCH_WIDTH / 2 - TOUCHLINE_MARGIN, PITCH_WIDTH / 2 + TOUCHLINE_MARGIN],
        tickmode: "array",
        tickvals: KEY_Y_TICKS,
        ticktext: KEY_Y_TICKS.map((value) => String(value)),
        showgrid: true,
        gridcolor: "rgba(0,0,0,0.12)",
        zeroline: false,
        scaleanchor: "x",
        scaleratio: 1,
      },
      shapes: buildPitchShapes(cssBlack),
      showlegend: true,
      legend: {
        orientation: "h",
        x: 0,
        y: -0.14,
        xanchor: "left",
        yanchor: "top",
        font: { color: cssBlack },
      },
    };

    Plotly.react(node, traces, layout, { responsive: true, displayModeBar: true });

    const ro = new ResizeObserver(() => Plotly.Plots.resize(node));
    ro.observe(node);
    return () => {
      ro.disconnect();
    };
  }, [cssBlack, colorMap, data, pointsBefore, pointsAfter, selectedPoints]);

  if (!data.length) return null;

  return <div className={styles.chart} ref={containerRef} />;
}

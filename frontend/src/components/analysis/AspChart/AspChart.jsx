import { useCallback, useMemo, useRef } from "react";

import usePlotlyChart from "../../../hooks/analysis/usePlotlyChart";
import styles from "./AspChart.module.css";
import { getCssVar } from "../../../utils/shared/getCssVar";
import { hexToRgba } from "../../../utils/shared/hexToRgba";
import { getContextWindowPoints } from "../../../utils/analysis/selectionWindow";

function buildContextTrace(
  itemName,
  windowPoints,
  selectedIndexSet,
  base,
  formatSpeed,
  asCustomData,
) {
  const markerSizes = windowPoints.map((point) => (selectedIndexSet.has(point.index) ? 0 : 4));
  return {
    name: `${itemName} context`,
    type: "scatter",
    mode: "lines+markers",
    x: windowPoints.map((point) => formatSpeed(point.speed)),
    y: windowPoints.map((point) => point.acceleration),
    customdata: windowPoints.map((point) => asCustomData(point, "context")),
    line: {
      color: base,
      width: 1.5,
    },
    marker: {
      size: markerSizes,
      color: base,
    },
    hovertemplate: "Speed: %{x:.3f}<br>%{customdata[7]}: %{y:.3f}<extra>%{fullData.name}</extra>",
    showlegend: false,
  };
}

function buildSelectedTrace(itemName, points, base, formatSpeed, asCustomData) {
  return {
    name: `${itemName} selected`,
    type: "scatter",
    mode: "markers",
    x: points.map((point) => formatSpeed(point.speed)),
    y: points.map((point) => point.acceleration),
    customdata: points.map((point) => asCustomData(point, "selected")),
    marker: {
      size: 7,
      color: base,
      symbol: "diamond",
    },
    hovertemplate: "Speed: %{x:.3f}<br>%{customdata[7]}: %{y:.3f}<extra>%{fullData.name}</extra>",
    showlegend: false,
  };
}

export default function AspChart({
  profiles,
  title = "Acceleration-Speed Profile",
  yAxisTitle = "Acceleration (m/s²)",
  plotMultiplier = 1,
  valueMode = "acceleration",
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
      .filter((profileItem) => profileItem?.profile?.fit)
      .filter(
        (profileItem) =>
          !hiddenMap?.[profileItem.hiddenKey || profileItem.name] && !hiddenMap?.[profileItem.name],
      );
    if (!valid.length) return null;

    const allTraces = [];
    const shapes = [];
    const maximumAccelerationCandidates = [];
    const globalMinSpeed = valid.reduce(
      (min, item) => Math.min(min, Number(item.profile?.meta?.min_speed ?? 0)),
      Number.POSITIVE_INFINITY,
    );
    const globalMaxSpeed = valid
      .flatMap((profileItem) =>
        (profileItem.points || [])
          .filter(
            (point) => point.classification === "included" || point.classification === "selected",
          )
          .map((point) => point.speed),
      )
      .reduce((max, value) => Math.max(max, Number(value)), Number.NEGATIVE_INFINITY);

    valid.forEach((item) => {
      const base = colorMap?.[item.name];
      const profile = item.profile;
      const bodyMass = Number(profile.meta.body_mass_kg);
      const valueMultiplier = valueMode === "force" ? bodyMass : 1;
      const multiplier = plotMultiplier * valueMultiplier;
      const valueLabel =
        valueMode === "force" ? "Force" : plotMultiplier < 0 ? "Deceleration" : "Acceleration";

      const allPoints = (item.points || []).map((point) => ({
        index: point.index,
        time: point.time,
        absoluteTime: point.absolute_time || "",
        speed: point.speed,
        acceleration: Number(point.acceleration) * multiplier,
        classification: point.classification,
      }));

      allPoints.forEach((point) => {
        maximumAccelerationCandidates.push(point.acceleration);
      });

      const excluded = allPoints.filter((point) => point.classification === "excluded");
      const included = allPoints.filter((point) => point.classification === "included");
      const selected = allPoints.filter((point) => point.classification === "selected");

      const asCustomData = (point, kind) => [
        item.name,
        point.index,
        point.time,
        point.absoluteTime || "",
        point.speed,
        point.acceleration,
        kind,
        valueLabel,
      ];

      allTraces.push(
        {
          name: `${item.name} rejected`,
          type: "scattergl",
          mode: "markers",
          x: excluded.map((point) => formatSpeed(point.speed)),
          y: excluded.map((point) => point.acceleration),
          customdata: excluded.map((point) => asCustomData(point, "rejected")),
          marker: { size: 4, color: base ? hexToRgba(base, 0.2) : undefined },
          hovertemplate:
            "Speed: %{x:.3f}<br>%{customdata[7]}: %{y:.3f}<extra>%{fullData.name}</extra>",
          showlegend: true,
        },
        {
          name: `${item.name} included`,
          type: "scattergl",
          mode: "markers",
          x: included.map((point) => formatSpeed(point.speed)),
          y: included.map((point) => point.acceleration),
          customdata: included.map((point) => asCustomData(point, "included")),
          marker: { size: 4, color: base ? hexToRgba(base, 0.4) : undefined },
          hovertemplate:
            "Speed: %{x:.3f}<br>%{customdata[7]}: %{y:.3f}<extra>%{fullData.name}</extra>",
          showlegend: true,
        },
        {
          name: `${item.name} points`,
          type: "scattergl",
          mode: "markers",
          x: selected.map((point) => formatSpeed(point.speed)),
          y: selected.map((point) => point.acceleration),
          customdata: selected.map((point) => asCustomData(point, "points")),
          marker: { size: 7, color: base ? hexToRgba(base, 0.9) : undefined },
          hovertemplate:
            "Speed: %{x:.3f}<br>%{customdata[7]}: %{y:.3f}<extra>%{fullData.name}</extra>",
          showlegend: true,
        },
      );

      const cutoff = Number(profile?.meta?.min_speed ?? 0);
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

      if (profile.fit) {
        const { intercept, zero_crossing_speed } = profile.fit;
        const fitPoints = [
          { speed: 0, acceleration: Number(intercept) * multiplier },
          { speed: Number(zero_crossing_speed), acceleration: 0 },
        ];
        fitPoints.forEach((point) => {
          maximumAccelerationCandidates.push(point.acceleration);
        });
        allTraces.push({
          name: `${item.name} fit`,
          type: "scatter",
          mode: "lines",
          x: fitPoints.map((point) => formatSpeed(point.speed)),
          y: fitPoints.map((point) => point.acceleration),
          line: { color: base, width: 2 },
          hovertemplate: `Speed: %{x:.3f}<br>${valueLabel}: %{y:.3f}<extra>%{fullData.name}</extra>`,
          showlegend: true,
        });
      }

      const selectedForFile = selectedPoints.filter((point) => point.name === item.name);
      if (selectedForFile.length > 0 && allPoints.length > 0) {
        const selectedIndexSet = new Set(selectedForFile.map((point) => Number(point.index)));
        const centers = [];
        selectedForFile.forEach((selectedPoint) => {
          const selectedIndex = Number(selectedPoint.index);
          const windowPoints = getContextWindowPoints(
            allPoints,
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
          const centerPoint = allPoints.find((point) => point.index === selectedIndex);
          if (centerPoint) centers.push(centerPoint);
        });
        if (centers.length > 0) {
          const ordered = [...centers].sort((a, b) => a.index - b.index);
          allTraces.push(buildSelectedTrace(item.name, ordered, base, formatSpeed, asCustomData));
        }
      }
    });

    const globalMaximumAcceleration = maximumAccelerationCandidates.reduce(
      (max, value) => Math.max(max, Number(value)),
      Number.NEGATIVE_INFINITY,
    );

    return {
      traces: allTraces,
      shapes,
      minSpeed: Number.isFinite(globalMinSpeed) ? formatSpeed(globalMinSpeed) : 0,
      maxSpeed: Number.isFinite(globalMaxSpeed) ? formatSpeed(globalMaxSpeed) : 0,
      maxAccel: Number.isFinite(globalMaximumAcceleration) ? globalMaximumAcceleration : 0,
    };
  }, [
    profiles,
    plotMultiplier,
    valueMode,
    colorMap,
    hiddenMap,
    selectedPoints,
    pointsBefore,
    pointsAfter,
    formatSpeed,
    cssBlack,
  ]);

  const layout = useMemo(() => {
    if (!data) return null;
    return {
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
  }, [data, title, yAxisTitle, speedUnitLabel, cssBlack]);

  const config = useMemo(() => ({ responsive: true, displayModeBar: true }), []);
  const onClick = useCallback(
    (event) => {
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
        acceleration: Number(custom[5]),
        kind: custom[6] || "point",
      });
    },
    [onPointSelect],
  );
  const onSelected = useCallback(
    (event) => {
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
          acceleration: Number(c[5]),
          kind: c[6] || "point",
        }));
      if (points.length) onPointsSelect(points);
    },
    [onPointsSelect],
  );
  const events = useMemo(
    () => [
      { name: "plotly_click", handler: onClick },
      { name: "plotly_selected", handler: onSelected },
    ],
    [onClick, onSelected],
  );
  usePlotlyChart({
    containerRef,
    traces: data?.traces,
    layout,
    config,
    enabled: Boolean(data),
    events,
  });

  return <div className={styles.chart} ref={containerRef} />;
}

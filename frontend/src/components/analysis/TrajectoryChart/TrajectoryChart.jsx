import { useMemo, useRef } from "react";

import usePlotlyChart from "../../../hooks/analysis/usePlotlyChart";
import { getCssVar } from "../../../utils/shared/getCssVar";
import { prepareTrajectory } from "../../../utils/analysis/trajectoryProjection";
import { buildTrajectoryTraces } from "../../../utils/analysis/trajectoryPlotTraces";
import {
  buildPitchAnnotations,
  buildPitchShapes,
  KEY_X_TICKS,
  KEY_Y_TICKS,
  PITCH_LENGTH,
  PITCH_WIDTH,
  TOUCHLINE_MARGIN,
} from "../../../utils/analysis/trajectoryPitch";
import styles from "./TrajectoryChart.module.css";

export default function TrajectoryChart({
  profiles,
  colorMap,
  selectedPoints,
  pointsBefore = 10,
  pointsAfter = 10,
  formatTimeLabel,
  valueMode = "acceleration",
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

  const plotSpec = useMemo(() => {
    if (!data.length) return null;
    const traces = buildTrajectoryTraces({
      data,
      colorMap,
      selectedPoints,
      pointsBefore,
      pointsAfter,
      formatTimeLabel,
      valueMode,
    });

    const layout = {
      title: { text: "Player Trajectory", font: { color: cssBlack } },
      font: { color: cssBlack },
      uirevision: "trajectory",
      paper_bgcolor: "white",
      plot_bgcolor: "white",
      margin: { l: 56, r: 16, t: 40, b: 54 },
      xaxis: {
        title: { text: "Pitch length (m)", font: { color: cssBlack } },
        range: [-TOUCHLINE_MARGIN, PITCH_LENGTH + TOUCHLINE_MARGIN],
        tickmode: "array",
        tickvals: KEY_X_TICKS,
        ticktext: KEY_X_TICKS.map((value) => String(value)),
        showgrid: true,
        gridcolor: "rgba(0,0,0,0.12)",
        zeroline: false,
      },
      yaxis: {
        title: { text: "Pitch width (m)", font: { color: cssBlack } },
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
      annotations: buildPitchAnnotations(cssBlack),
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

    return { traces, layout };
  }, [
    cssBlack,
    colorMap,
    data,
    formatTimeLabel,
    pointsBefore,
    pointsAfter,
    selectedPoints,
    valueMode,
  ]);
  const config = useMemo(() => ({ responsive: true, displayModeBar: true }), []);
  usePlotlyChart({
    containerRef,
    traces: plotSpec?.traces,
    layout: plotSpec?.layout,
    config,
    enabled: Boolean(plotSpec),
  });

  if (!data.length) return null;

  return <div className={styles.chart} ref={containerRef} />;
}

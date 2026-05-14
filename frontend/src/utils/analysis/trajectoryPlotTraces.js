import { hexToRgba } from "../shared/hexToRgba";
import { getContextWindowPoints, groupSelectedPointsByFile, uniquePointsByIndex } from "./selectionWindow";
import { X_OFFSET } from "./trajectoryPitch";

function valueLabel(isForceMode) {
  return isForceMode ? "Force" : "Acceleration";
}

function valueUnit(isForceMode) {
  return isForceMode ? "N" : "m/s²";
}

function buildHoverTemplate(fileName, timeIndex, speedIndex, valueIndex, isForceMode) {
  const namePrefix = fileName || "%{fullData.name}";
  return `${namePrefix}<br>Time: %{customdata[${timeIndex}]}<br>X: %{x:.2f} m<br>Y: %{y:.2f} m<br>Speed: %{customdata[${speedIndex}]:.3f} m/s<br>${valueLabel(isForceMode)}: %{customdata[${valueIndex}]:.3f} ${valueUnit(isForceMode)}<extra></extra>`;
}

export function buildTrajectoryTraces({
  data,
  colorMap,
  selectedPoints,
  pointsBefore,
  pointsAfter,
  formatTimeLabel,
  valueMode,
}) {
  const traces = [];
  const selectedByFile = groupSelectedPointsByFile(selectedPoints);
  const isForceMode = valueMode === "force";

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
        formatTimeLabel(point.time, point.absoluteTime),
        point.absoluteTime,
        point.speed,
        isForceMode ? point.force : point.acceleration,
      ]),
      hovertemplate: buildHoverTemplate(null, 2, 4, 5, isForceMode),
    });
  });

  data.forEach((series) => {
    const fileName = series[0]?.name;
    const selectedForFile = selectedByFile.get(fileName) || [];
    if (!selectedForFile.length) return;

    const baseColor = colorMap?.[fileName] || "#1f77b4";
    const byIndex = [...series].sort((firstPoint, secondPoint) => firstPoint.index - secondPoint.index);
    const pointDots = [];
    const centerPoints = [];

    selectedForFile.forEach((selectedPoint) => {
      const center = byIndex.find((point) => point.index === selectedPoint.index);
      if (!center) return;
      centerPoints.push(center);
      pointDots.push(...getContextWindowPoints(byIndex, selectedPoint.index, pointsBefore, pointsAfter));
    });

    const dotPoints = uniquePointsByIndex(pointDots);
    const centers = uniquePointsByIndex(centerPoints);

    if (dotPoints.length) {
      traces.push({
        type: "scatter",
        mode: "markers",
        x: dotPoints.map((point) => point.x + X_OFFSET),
        y: dotPoints.map((point) => point.y),
        customdata: dotPoints.map((point) => [
          formatTimeLabel(point.time, point.absoluteTime),
          point.speed,
          isForceMode ? point.force : point.acceleration,
        ]),
        marker: {
          size: 7,
          color: baseColor,
          opacity: 0.85,
        },
        name: `${fileName} selected points`,
        hovertemplate: buildHoverTemplate(fileName, 0, 1, 2, isForceMode),
        showlegend: false,
      });
    }

    if (centers.length) {
      traces.push({
        type: "scatter",
        mode: "markers",
        x: centers.map((point) => point.x + X_OFFSET),
        y: centers.map((point) => point.y),
        customdata: centers.map((point) => [
          formatTimeLabel(point.time, point.absoluteTime),
          point.speed,
          isForceMode ? point.force : point.acceleration,
        ]),
        marker: {
          size: 11,
          symbol: "diamond",
          color: centers.map((point) => colorMap?.[point.name] || "#1f77b4"),
          line: { width: 0 },
        },
        name: `${fileName} selected center`,
        hovertemplate: buildHoverTemplate(fileName, 0, 1, 2, isForceMode),
        showlegend: false,
      });
    }
  });

  return traces;
}

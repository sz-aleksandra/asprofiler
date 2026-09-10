export function buildHorizontalLegend(legendYPosition) {
  return {
    orientation: "h",
    x: 0,
    y: legendYPosition,
    xanchor: "left",
    yanchor: "top",
  };
}

export function getPointsAroundChosenAnalysisPoint(
  points,
  chosenAnalysisPoint,
  beforeChosenAnalysisPointsCount,
  afterChosenAnalysisPointsCount,
) {
  return points.slice(
    Math.max(0, chosenAnalysisPoint.timeSeriesIndex - beforeChosenAnalysisPointsCount),
    chosenAnalysisPoint.timeSeriesIndex + afterChosenAnalysisPointsCount + 1,
  );
}

export function groupPointsByFileName(points) {
  const pointsByFileName = new Map();
  points.forEach((point) => {
    const existingPoints = pointsByFileName.get(point.fileName) ?? [];
    existingPoints.push(point);
    pointsByFileName.set(point.fileName, existingPoints);
  });
  return pointsByFileName;
}

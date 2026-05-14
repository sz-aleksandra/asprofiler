export function getContextWindowPoints(points, selectedIndex, pointsBefore, pointsAfter) {
  const rangeFrom = selectedIndex - pointsBefore;
  const rangeTo = selectedIndex + pointsAfter;
  return points.filter((point) => point.index >= rangeFrom && point.index <= rangeTo);
}

export function uniquePointsByIndex(points) {
  return [...new Map(points.map((point) => [point.index, point])).values()].sort(
    (firstPoint, secondPoint) => firstPoint.index - secondPoint.index,
  );
}

export function groupSelectedPointsByFile(selectedPoints) {
  const selectedByFile = new Map();
  (selectedPoints || []).forEach((point) => {
    if (!point?.name || !Number.isInteger(Number(point?.index))) return;
    const filePoints = selectedByFile.get(point.name) || [];
    filePoints.push({ ...point, index: Number(point.index) });
    selectedByFile.set(point.name, filePoints);
  });
  return selectedByFile;
}

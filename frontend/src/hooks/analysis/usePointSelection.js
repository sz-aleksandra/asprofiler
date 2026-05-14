import { useMemo, useState } from "react";

function pointKey(point) {
  return `${point.name}::${point.index}`;
}

export default function usePointSelection(visibleResults, timeMode) {
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [markedPointMap, setMarkedPointMap] = useState({});
  const [pointsBefore, setPointsBefore] = useState(10);
  const [pointsAfter, setPointsAfter] = useState(10);
  const [pointsSortRules, setPointsSortRules] = useState([]);

  const visibleFileNames = useMemo(
    () => new Set(visibleResults.map((item) => item.name)),
    [visibleResults],
  );

  const visibleSelectedPoints = useMemo(
    () => selectedPoints.filter((point) => visibleFileNames.has(point.name)),
    [selectedPoints, visibleFileNames],
  );

  const getPointDisplayTime = (point) => {
    const rawTime = point?.rawTime ?? point?.time;
    if (timeMode === "absolute") return rawTime;
    const numericTime = Number(rawTime);
    return Number.isFinite(numericTime) ? numericTime : rawTime;
  };

  const filteredSelectedPoints = useMemo(() => {
    const sorted = [...visibleSelectedPoints];
    if (!pointsSortRules.length) return sorted;
    sorted.sort((a, b) => {
      for (const rule of pointsSortRules) {
        let cmp = 0;
        if (rule.key === "name") cmp = String(a.name).localeCompare(String(b.name));
        if (rule.key === "time")
          cmp = Number(getPointDisplayTime(a)) - Number(getPointDisplayTime(b));
        if (rule.key === "speed") cmp = Number(a.speed) - Number(b.speed);
        if (rule.key === "acceleration") cmp = Number(a.acceleration) - Number(b.acceleration);
        if (cmp !== 0) return rule.dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSelectedPoints, pointsSortRules, timeMode]);

  const selectedVisibleCount = visibleSelectedPoints.filter(
    (point) => markedPointMap[pointKey(point)],
  ).length;

  const allPointsMarked =
    visibleSelectedPoints.length > 0 &&
    visibleSelectedPoints.every((point) => Boolean(markedPointMap[pointKey(point)]));

  const onAspPointSelect = (point) => {
    const pointIndex = Number(point?.index);
    const pointTime = Number(point?.time);
    if (
      !point?.name ||
      !Number.isInteger(pointIndex) ||
      pointIndex < 0 ||
      !Number.isFinite(pointTime)
    )
      return;
    const key = `${point.name}::${pointIndex}`;
    setSelectedPoints((prev) => {
      const exists = prev.some((selectedPoint) => `${selectedPoint.name}::${selectedPoint.index}` === key);
      if (exists) {
        setMarkedPointMap((map) => {
          const next = { ...map };
          delete next[key];
          return next;
        });
        return prev.filter((selectedPoint) => `${selectedPoint.name}::${selectedPoint.index}` !== key);
      }
      return [...prev, { ...point, index: pointIndex, time: pointTime, rawTime: pointTime }];
    });
  };

  const onAspPointsSelect = (points) => {
    if (!Array.isArray(points) || !points.length) return;
    setSelectedPoints((prev) => {
      const existing = new Set(prev.map((selectedPoint) => `${selectedPoint.name}::${selectedPoint.index}`));
      const additions = points
        .map((point) => {
          const pointIndex = Number(point?.index);
          const pointTime = Number(point?.time);
          if (
            !point?.name ||
            !Number.isInteger(pointIndex) ||
            pointIndex < 0 ||
            !Number.isFinite(pointTime)
          )
            return null;
          const key = `${point.name}::${pointIndex}`;
          if (existing.has(key)) return null;
          existing.add(key);
          return { ...point, index: pointIndex, time: pointTime, rawTime: pointTime };
        })
        .filter(Boolean);
      return additions.length ? [...prev, ...additions] : prev;
    });
  };

  const toggleSortRule = (key) => {
    setPointsSortRules((prev) => {
      const ruleIndex = prev.findIndex((rule) => rule.key === key);
      if (ruleIndex === -1) return [...prev, { key, dir: "asc" }];
      if (prev[ruleIndex].dir === "asc") {
        const next = [...prev];
        next[ruleIndex] = { ...prev[ruleIndex], dir: "desc" };
        return next;
      }
      return prev.filter((rule) => rule.key !== key);
    });
  };

  const sortBadge = (key) => {
    const ruleIndex = pointsSortRules.findIndex((rule) => rule.key === key);
    if (ruleIndex === -1) return "";
    return ` ${pointsSortRules[ruleIndex].dir}(${ruleIndex + 1})`;
  };

  return {
    selectedPoints,
    setSelectedPoints,
    markedPointMap,
    setMarkedPointMap,
    pointsBefore,
    setPointsBefore,
    pointsAfter,
    setPointsAfter,
    visibleSelectedPoints,
    filteredSelectedPoints,
    selectedVisibleCount,
    allPointsMarked,
    pointKey,
    onAspPointSelect,
    onAspPointsSelect,
    toggleSortRule,
    sortBadge,
  };
}

import { mPerSToKmh } from "../shared/conversions";

import { EVENT_BIN_DEFS } from "./constants";
const absoluteTimesCache = new WeakMap();
const DAY_SECONDS = 86_400;
const RUN_LENGTH_ENCODING_LABELS = {
  s: "selected",
  i: "included",
  e: "excluded",
};
const POINT_COMPARATORS = {
  fileName: (firstPoint, secondPoint) => firstPoint.fileName.localeCompare(secondPoint.fileName),
  time: (firstPoint, secondPoint) => firstPoint.relativeTime - secondPoint.relativeTime,
  relativeTime: (firstPoint, secondPoint) => firstPoint.relativeTime - secondPoint.relativeTime,
  speed: (firstPoint, secondPoint) => firstPoint.speed - secondPoint.speed,
  acc: (firstPoint, secondPoint) => firstPoint.acc - secondPoint.acc,
  metricValue: (firstPoint, secondPoint) => firstPoint.metricValue - secondPoint.metricValue,
};
export function safeScaleByMass(statOrMetricValue, bodyMass) {
  return statOrMetricValue == null ? null : statOrMetricValue * bodyMass;
}
export function safeAbs(statOrMetricValue) {
  return statOrMetricValue == null ? null : Math.abs(statOrMetricValue);
}
export function formatOrDash(statOrMetricValue, formatFunction) {
  return statOrMetricValue == null ? "-" : formatFunction(statOrMetricValue);
}
export function formatToTwoDecimalPlaces(statOrMetricValue) {
  return formatOrDash(statOrMetricValue, (numericValue) => numericValue.toFixed(2));
}
export function formatSpeedPair(speedValueMPerS) {
  return formatOrDash(
    speedValueMPerS,
    (numericValue) =>
      `${numericValue.toFixed(2)} m/s (${mPerSToKmh(numericValue).toFixed(2)} km/h)`,
  );
}
export function formatBinRange({ binUpperBound, binLowerBound }) {
  return binUpperBound == null
    ? `>=${String(Number(binLowerBound.toFixed(2)))}`
    : `${String(Number(binLowerBound.toFixed(2)))}-${String(Number(binUpperBound.toFixed(2)))}`;
}
export function binLabelToRangeText(binLabelToFormat, binMode, binMetric) {
  if (binLabelToFormat === "All") return binLabelToFormat;
  const binDef = EVENT_BIN_DEFS[binMode][binMetric].find(
    ({ binLabel }) => binLabel === binLabelToFormat,
  );
  return formatBinRange(binDef);
}
export function runLengthEncodingToSampleLabels(runLengthEncoding) {
  return runLengthEncoding.flatMap(([runLengthEncodingCode, runLengthEncodingCount]) =>
    Array(runLengthEncodingCount).fill(RUN_LENGTH_ENCODING_LABELS[runLengthEncodingCode]),
  );
}
export function relativeTimeSeriesToAbsoluteTimes(relativeTimeSeries) {
  if (absoluteTimesCache.has(relativeTimeSeries)) return absoluteTimesCache.get(relativeTimeSeries);
  const [hoursPart, minutesPart, secondsPart] = relativeTimeSeries.start_time
    .split(":")
    .map(Number);
  const startSeconds = hoursPart * 3600 + minutesPart * 60 + secondsPart;
  const absoluteTimes = relativeTimeSeries.relative_times.map(
    (relativeSeconds) => (startSeconds + relativeSeconds) % DAY_SECONDS,
  );
  absoluteTimesCache.set(relativeTimeSeries, absoluteTimes);
  return absoluteTimes;
}
export function secondsToTime(seconds) {
  const hoursPart = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const minutesPart = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const secondsPart = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${hoursPart}:${minutesPart}:${secondsPart}`;
}
export function sortPoints(points, sortRules) {
  if (!sortRules.length) return points;
  return [...points].sort((firstSamplePoint, secondSamplePoint) => {
    for (const { sortKey, sortDirection } of sortRules) {
      const ascendingComparison = POINT_COMPARATORS[sortKey](firstSamplePoint, secondSamplePoint);
      if (ascendingComparison !== 0) {
        return sortDirection === "asc" ? ascendingComparison : -ascendingComparison;
      }
    }
    return 0;
  });
}
export function getNextSortRules(previousSortRules, toggledSortRuleKey) {
  const toggledSortRuleIndex = previousSortRules.findIndex(
    (sortRule) => sortRule.sortKey === toggledSortRuleKey,
  );
  if (toggledSortRuleIndex === -1)
    return [
      ...previousSortRules,
      {
        sortKey: toggledSortRuleKey,
        sortDirection: "asc",
      },
    ];
  if (previousSortRules[toggledSortRuleIndex].sortDirection === "asc") {
    const nextSortRules = [...previousSortRules];
    nextSortRules[toggledSortRuleIndex] = {
      ...previousSortRules[toggledSortRuleIndex],
      sortDirection: "desc",
    };
    return nextSortRules;
  }
  return previousSortRules.filter((sortRule) => sortRule.sortKey !== toggledSortRuleKey);
}
export function hexToRgba(hexColor, alphaChannel) {
  const hexValue = parseInt(hexColor.slice(1), 16);
  return `rgba(${(hexValue >> 16) & 255}, ${(hexValue >> 8) & 255}, ${hexValue & 255}, ${alphaChannel})`;
}

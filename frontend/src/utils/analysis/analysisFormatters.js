export function toKmh(value) {
  return Number(value) * 3.6;
}

export function formatNumber(v) {
  return v === undefined || v === null || Number.isNaN(v) ? "-" : Number(v).toFixed(2);
}

export function fmtWithUnit(v, unit) {
  if (v === undefined || v === null || Number.isNaN(v)) return "-";
  return `${Number(v).toFixed(2)} ${unit}`;
}

export function fmtCount(value) {
  return value === undefined || value === null || Number.isNaN(value)
    ? "-"
    : String(Math.round(Number(value)));
}

export function formatSpeedPair(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return `${Number(value).toFixed(2)} m/s (${toKmh(value).toFixed(2)} km/h)`;
}

export function formatDistanceKm(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return `${(Number(value) / 1000).toFixed(2)} km`;
}

export function fitSlopeLabel(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return Number(value).toFixed(2);
}

export function formatSecondsClock(value, fractionDigits = 0) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  const totalSeconds = Number(value);
  const sign = totalSeconds < 0 ? "-" : "";
  const safeSeconds = Math.abs(totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secondsValue = safeSeconds % 60;
  const secondsText =
    fractionDigits > 0
      ? secondsValue.toFixed(fractionDigits).padStart(3 + fractionDigits, "0")
      : String(Math.floor(secondsValue)).padStart(2, "0");
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${secondsText}`;
}

export function formatAbsoluteClock(value, fractionDigits = 0) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const parts = raw.split(":");
  if (parts.length !== 3) return raw;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const seconds = Number(parts[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) return raw;
  const secondsText =
    fractionDigits > 0
      ? seconds.toFixed(fractionDigits).padStart(3 + fractionDigits, "0")
      : String(Math.floor(seconds)).padStart(2, "0");
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${secondsText}`;
}

export function formatGpsDuration(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  const seconds = Number(value);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secondsPart = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${secondsPart}`;
}

export function formatSecondsValue(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return `${Number(value).toFixed(2)} s`;
}

export function makeTimeFormatters(timeMode, canUseAbsoluteTimeAxis) {
  const getPointDisplayTime = (point) => {
    const rawTime = point?.rawTime ?? point?.time;
    if (timeMode === "absolute") return rawTime;
    const numericTime = Number(rawTime);
    return Number.isFinite(numericTime) ? numericTime : rawTime;
  };

  const formatPointTime = (point) => {
    if (timeMode === "absolute" && point?.absoluteTime)
      return formatAbsoluteClock(point.absoluteTime);
    return formatSecondsClock(getPointDisplayTime(point));
  };

  const formatTrajectoryTime = (seconds, absoluteTime) => {
    if (timeMode === "absolute" && absoluteTime) return formatAbsoluteClock(absoluteTime, 1);
    const value = Number(seconds);
    if (!Number.isFinite(value)) return "-";
    return formatSecondsClock(value, 1);
  };

  const xTickFormatter = (value, label) =>
    canUseAbsoluteTimeAxis && label ? formatAbsoluteClock(label, 1) : formatSecondsClock(value, 1);

  const xHoverFormatter = (value, label) =>
    canUseAbsoluteTimeAxis && label ? formatAbsoluteClock(label, 1) : formatSecondsClock(value, 1);

  return { formatPointTime, formatTrajectoryTime, xTickFormatter, xHoverFormatter };
}

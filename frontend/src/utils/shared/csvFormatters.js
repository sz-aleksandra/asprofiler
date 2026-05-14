export function formatNumber(value, digits = 2) {
  return value === undefined || value === null || Number.isNaN(value)
    ? ""
    : Number(value).toFixed(digits);
}

export function formatSpeedKmh(value, digits = 2) {
  return value === undefined || value === null || Number.isNaN(value)
    ? ""
    : metersPerSecondToKmh(value).toFixed(digits);
}

export function toKmh(value) {
  return value === undefined || value === null || Number.isNaN(value)
    ? value
    : metersPerSecondToKmh(value);
}

export function formatDuration(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  const seconds = Number(value);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secondsPart = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${secondsPart}`;
}

export function scaleToForce(value, bodyMassKg) {
  return value === undefined || value === null || Number.isNaN(value)
    ? ""
    : formatNumber(accelerationToForce(value, bodyMassKg));
}

export function zoneLabel(zone) {
  return zone === "full" ? "full" : zone;
}

export function scopeLabel(scope) {
  return scope === "high_speed_running" ? "high_speed_running" : "all";
}
import { accelerationToForce, metersPerSecondToKmh } from "./unitConversions";

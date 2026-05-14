export { formatNumber, formatSpeedKmh, zoneLabel } from "../shared/csvFormatters";

export function formatRatio(numerator, denominator) {
  if (
    numerator === undefined ||
    numerator === null ||
    denominator === undefined ||
    denominator === null ||
    Number.isNaN(numerator) ||
    Number.isNaN(denominator) ||
    Number(denominator) === 0
  ) {
    return "";
  }
  return (Number(numerator) / Number(denominator)).toFixed(2);
}

export function formatText(value) {
  return value === undefined || value === null ? "" : String(value);
}

export function formatCoordinate(value) {
  return value === undefined || value === null || Number.isNaN(value)
    ? ""
    : Number(value).toFixed(6);
}

export function getBodyMassKg(results, fileName, direction) {
  const item = (results || []).find((entry) => entry.name === fileName);
  const profile =
    direction === "acceleration"
      ? item?.profile?.acceleration_profile
      : item?.profile?.deceleration_profile;
  return Number(profile?.meta?.body_mass_kg || 1);
}

export function getDirectionPayload(item, direction) {
  return direction === "acceleration"
    ? item?.profile?.acceleration_events
    : item?.profile?.deceleration_events;
}

function findResultItem(results, fileName) {
  return (results || []).find((entry) => entry.name === fileName);
}

function getBinLabel(value, config = []) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "";

  const match = config.find((bin) => {
    const lower = Number(bin?.lower);
    const upper = bin?.upper == null ? null : Number(bin.upper);
    if (!Number.isFinite(lower) || numericValue < lower) return false;
    if (upper == null) return true;
    return numericValue < upper;
  });

  return match?.label || "";
}

function formatEdge(edge) {
  return Number.isInteger(edge) ? String(edge) : String(Number(edge.toFixed(2)));
}

export function formatBinRange(value, config = [], multiplier = 1) {
  const label = getBinLabel(value, config);
  const match = config.find((bin) => bin?.label === label);
  if (!match) return "";

  const lower = Number(match.lower) * multiplier;
  const upper = match.upper == null ? null : Number(match.upper) * multiplier;
  if (!Number.isFinite(lower)) return "";

  if (upper == null || !Number.isFinite(upper)) {
    return `>=${formatEdge(lower)}`;
  }

  return `${formatEdge(lower)}-${formatEdge(upper)}`;
}

export function formatConfiguredBinLabel(results, fileName, direction, binMode, label, useForce = false) {
  if (label === "All" || !label) return formatText(label);

  const item = findResultItem(results, fileName);
  const payload = getDirectionPayload(item, direction);
  const config = payload?.config?.bins?.[binMode] || [];
  const match = config.find((bin) => bin?.label === label);
  if (!match) return formatText(label);

  const multiplier = useForce ? getBodyMassKg(results, fileName, direction) : 1;
  const lower = Number(match.lower) * multiplier;
  const upper = match.upper == null ? null : Number(match.upper) * multiplier;

  if (!Number.isFinite(lower)) return formatText(label);
  if (upper == null || !Number.isFinite(upper)) return `>=${formatEdge(lower)}`;
  return `${formatEdge(lower)}-${formatEdge(upper)}`;
}

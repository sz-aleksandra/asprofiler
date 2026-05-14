import { scaleByMass as scaleValueByMass } from "../shared/unitConversions";
import { buildDirectionalEventRows } from "../shared/analysisRows";

export const EVENT_SCOPES = ["all", "high_speed_running"];
export const EVENT_ZONES = ["full", "left", "middle", "right"];
export const EVENT_BIN_MODES = ["classic", "detailed"];
export const RAW_SCOPE_MAP = [
  { scopeKey: "global", zone: "full" },
  { scopeKey: "left", zone: "left" },
  { scopeKey: "middle", zone: "middle" },
  { scopeKey: "right", zone: "right" },
];

export function getDirectionalRows(results, direction, scope, zone, binMode) {
  return buildDirectionalEventRows({
    direction,
    visibleResults: results || [],
    isDirectionVisible: () => true,
    eventScopeMode: scope,
    eventZoneMode: zone,
    eventBinMode: binMode,
    colorMap: {},
  });
}

export function scaledByMass(value, bodyMassKg) {
  return value === undefined || value === null ? undefined : scaleValueByMass(value, bodyMassKg);
}

export function absoluteValue(value) {
  return value === undefined || value === null ? undefined : Math.abs(Number(value));
}

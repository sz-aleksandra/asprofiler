import {
  buildEarlyLateEventColumns as buildEarlyLateEventColumnsConfig,
  buildEventColumns as buildEventColumnsConfig,
  buildStatsColumns,
} from "./analysisColumns";

export const EVENT_TABLE_GRID_COLUMNS = "minmax(206px, 1.22fr) repeat(11, minmax(70px, 1fr))";
export const EARLY_LATE_TABLE_GRID_COLUMNS = "minmax(206px, 1.22fr) repeat(8, minmax(70px, 1fr))";
export const STATS_TABLE_GRID_COLUMNS = "minmax(280px, 2fr) repeat(6, minmax(52px, 1fr))";

import { buildStatsTableData } from "../shared/analysisRows";
import { renderSpeedStatValue, renderInfoHeader } from "./analysisRenderers";
import {
  fmtCount,
  fmtWithUnit,
  formatDistanceKm,
  formatGpsDuration,
  formatNumber,
  formatSecondsValue,
} from "./analysisFormatters";

function getEventBodyMassKg(results, fileName, direction) {
  const item = results.find((r) => r.name === fileName);
  const profile =
    direction === "acceleration"
      ? item.profile.acceleration_profile
      : item.profile.deceleration_profile;
  return Number(profile.meta.body_mass_kg);
}

export function buildAnalysisTableConfig({
  styles,
  isForceProfile,
  results,
  metricUnits,
  formatEventBinLabel,
  combinedStatsRows,
}) {
  const speedStatValue = (value) => renderSpeedStatValue(value, styles);
  const infoHeader = (label, lines) => renderInfoHeader(label, lines, styles);

  const statsTableData = buildStatsTableData({ combinedStatsRows, metricUnits });

  const statsColumns = buildStatsColumns({
    styles,
    renderSpeedStatValue: speedStatValue,
    fmtWithUnit,
    formatGpsDuration,
    renderInfoHeader: infoHeader,
    isForceProfile,
    formatDistanceKm,
  });

  const buildEventColumns = (horizontalPowerLabel, impulseLabel, ratioLabel, direction) =>
    buildEventColumnsConfig({
      styles,
      horizontalPowerLabel,
      impulseLabel,
      ratioLabel,
      direction,
      formatEventBinLabel,
      fmtCount,
      formatNumber,
      fmtWithUnit,
      formatSecondsValue,
      renderSpeedWithKmh: speedStatValue,
      renderInfoHeader: infoHeader,
      isForceProfile,
      getEventBodyMassKg: (fileName, dir) => getEventBodyMassKg(results, fileName, dir),
    });

  const buildEarlyLateEventColumns = (direction) =>
    buildEarlyLateEventColumnsConfig({
      styles,
      direction,
      formatEventBinLabel,
      fmtWithUnit,
      formatSecondsValue,
      renderInfoHeader: infoHeader,
      isForceProfile,
      getEventBodyMassKg: (fileName, dir) => getEventBodyMassKg(results, fileName, dir),
    });

  return { statsTableData, statsColumns, buildEventColumns, buildEarlyLateEventColumns };
}

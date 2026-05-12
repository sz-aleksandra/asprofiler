import { HIGH_SPEED_RUNNING_EVENT_LABEL } from "./analysisConstants";

function resolveScopeKey(eventZoneMode) {
  return eventZoneMode === "full" ? "global" : eventZoneMode;
}

export function getEventScopePayload(eventsPayload, eventZoneMode, eventScopeMode, eventBinMode) {
  const scopeKey = resolveScopeKey(eventZoneMode);
  const scope = eventsPayload?.scopes?.[scopeKey]?.[eventScopeMode];
  return {
    summary: scope?.summary || {},
    bins: scope?.bins?.[eventBinMode] || [],
    duration_seconds: Number(scope?.duration_seconds || 0),
  };
}

export function buildAnalysisColorMap(results, colorsMap, defaultColor) {
  return Object.fromEntries(
    results.map((item) => [item.name, colorsMap[item.name] || defaultColor]),
  );
}

export function buildAnalysisProfileRows({ results, colorMap, hiddenMap }) {
  return [
    ...results.map((item) => ({
      key: `${item.name}-acceleration`,
      fileName: item.name,
      profileLabel: "Acceleration",
      fit: item.profile?.acceleration_profile?.fit || null,
      plotMultiplier: 1,
      color: colorMap[item.name],
      hidden: hiddenMap[`${item.name}::acceleration`] || hiddenMap[item.name],
      bodyMassKg: Number(item.profile.acceleration_profile.meta.body_mass_kg),
    })),
    ...results.map((item) => ({
      key: `${item.name}-deceleration`,
      fileName: item.name,
      profileLabel: "Deceleration",
      fit: item.profile?.deceleration_profile?.fit || null,
      plotMultiplier: -1,
      color: colorMap[item.name],
      hidden: hiddenMap[`${item.name}::deceleration`] || hiddenMap[item.name],
      bodyMassKg: Number(item.profile.deceleration_profile.meta.body_mass_kg),
    })),
  ];
}

export function buildStatsTableData({ combinedStatsRows, metricUnits }) {
  return combinedStatsRows.map((row) => ({
    ...row,
    units: metricUnits(row.metric),
  }));
}

export function buildDirectionalEventRows({
  direction,
  visibleResults,
  isDirectionVisible,
  eventScopeMode,
  eventZoneMode,
  eventBinMode,
  colorMap,
}) {
  const sourceKey = direction === "acceleration" ? "acceleration_events" : "deceleration_events";
  const directionalVisibleResults = visibleResults.filter((item) =>
    isDirectionVisible(item.name, direction),
  );
  const isHighSpeedRunningOnly = eventScopeMode === "high_speed_running";
  const getScopedPayload = (payload) =>
    getEventScopePayload(payload, eventZoneMode, eventScopeMode, eventBinMode);
  const firstPayload = directionalVisibleResults
    .map((item) => getScopedPayload(item.profile?.[sourceKey]))
    .find((payload) => Array.isArray(payload?.bins) && payload.bins.length > 0);
  const orderedBins = [
    ...(isHighSpeedRunningOnly ? [HIGH_SPEED_RUNNING_EVENT_LABEL] : ["All"]),
    ...(firstPayload?.bins?.map((row) => row.bin) || []),
  ];

  const isAggregateBin = (binLabel) =>
    binLabel === "All" || binLabel === HIGH_SPEED_RUNNING_EVENT_LABEL;

  const buildRowsForBin = (binLabel) =>
    directionalVisibleResults.map((item) => {
      const payload = item.profile?.[sourceKey];
      const scopedPayload = getScopedPayload(payload);
      const summary = scopedPayload.summary || {};
      const bins = Array.isArray(scopedPayload.bins) ? scopedPayload.bins : [];
      const values = isAggregateBin(binLabel)
        ? summary
        : bins.find((binRow) => binRow.bin === binLabel) || {};

      return {
        fileName: item.name,
        color: colorMap[item.name],
        bin: binLabel,
        values,
      };
    });

  return orderedBins.flatMap((binLabel) => {
    const rows = buildRowsForBin(binLabel);
    if (!isAggregateBin(binLabel) && rows.every((row) => Number(row.values?.count || 0) === 0)) {
      return [];
    }
    return rows;
  });
}

export function normalizeAnalysisParams(raw = {}) {
  return { ...raw };
}

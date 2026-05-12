import { useMemo } from "react";

import {
  buildDirectionalEventDistributionChart,
  buildSpeedDistributionChart,
} from "../../utils/analysis/analysisCharts";
import { buildDirectionalEventRows } from "../../utils/shared/analysisRows";
import { formatEventBinLabel } from "../../utils/analysis/analysisColumns";
import { metricUnits, scaleStatValues } from "../../utils/analysis/analysisMath";

const DIRECTIONS = ["acceleration", "deceleration"];

function isDirectionVisible(hiddenMap, fileName, direction) {
  return !hiddenMap[`${fileName}::${direction}`] && !hiddenMap[fileName];
}

function getBodyMassKg(item) {
  return Number(item.profile.acceleration_profile.meta.body_mass_kg);
}

function buildAspProfilesForDirection(visibleResults, hiddenMap, direction) {
  const profileKey = `${direction}_profile`;
  const classificationKey = `${direction}_classification`;
  return visibleResults
    .filter((item) => isDirectionVisible(hiddenMap, item.name, direction))
    .map((item) => {
      const profile = item.profile?.[profileKey];
      if (!profile) return null;
      const points = (item.profile?.points || []).map((p) => ({
        ...p,
        classification: p[classificationKey],
      }));
      return { name: item.name, profile, points };
    })
    .filter(Boolean);
}

export default function useAnalysisData(results, hiddenMap, colorMap, prefs, analysisParameters) {
  const {
    speedSeriesUnit,
    timeMode,
    distributionScale,
    eventBinMode,
    eventScopeMode,
    eventZoneMode,
    statisticsScopeMode,
    profileViewMode,
  } = prefs;

  const isForceProfile = profileViewMode === "force";
  const speedSeriesFactor = speedSeriesUnit === "km/h" ? 3.6 : 1;

  const visibleResults = useMemo(
    () =>
      results.filter(
        (item) =>
          isDirectionVisible(hiddenMap, item.name, "acceleration") ||
          isDirectionVisible(hiddenMap, item.name, "deceleration"),
      ),
    [results, hiddenMap],
  );

  const allShown = useMemo(
    () =>
      results.length > 0 &&
      results.every(
        (item) =>
          isDirectionVisible(hiddenMap, item.name, "acceleration") &&
          isDirectionVisible(hiddenMap, item.name, "deceleration"),
      ),
    [results, hiddenMap],
  );

  const canUseAbsoluteTimeAxis = useMemo(
    () =>
      timeMode === "absolute" &&
      visibleResults.some(
        (item) =>
          Array.isArray(item.profile.timeseries.time) && item.profile.timeseries.time.length > 0,
      ),
    [timeMode, visibleResults],
  );

  const xAxisTitle = canUseAbsoluteTimeAxis ? "Absolute time" : "Time from start";

  const aspProfilesByDirection = useMemo(
    () =>
      Object.fromEntries(
        DIRECTIONS.map((direction) => [
          direction,
          buildAspProfilesForDirection(visibleResults, hiddenMap, direction),
        ]),
      ),
    [visibleResults, hiddenMap],
  );

  const combinedTimeseries = useMemo(() => {
    const speedSeries = [];
    const accelerationSeries = [];
    visibleResults.forEach((item) => {
      const { timeseries } = item.profile;
      const color = colorMap[item.name];
      if (timeseries.time.length && timeseries.speed.length) {
        speedSeries.push({
          name: item.name,
          values: timeseries.speed.map((v) => Number(v) * speedSeriesFactor),
          color,
          x: timeseries.relative_time,
          labels: timeMode === "absolute" ? timeseries.time : [],
        });
      }
      if (timeseries.relative_time.length && timeseries.acceleration.length) {
        const accelMultiplier = isForceProfile ? getBodyMassKg(item) : 1;
        accelerationSeries.push({
          name: item.name,
          values: timeseries.acceleration.map((v) => Number(v) * accelMultiplier),
          color,
          x: timeseries.relative_time,
          labels: timeMode === "absolute" ? timeseries.time : [],
        });
      }
    });
    return { speedSeries, accelerationSeries };
  }, [visibleResults, colorMap, speedSeriesFactor, timeMode, isForceProfile]);

  const speedReferenceLines = useMemo(
    () =>
      visibleResults
        .map((item) => ({
          y: Number(item?.profile?.meta?.min_speed) * speedSeriesFactor,
          color: colorMap[item.name],
          width: 1.5,
          dash: "dash",
        }))
        .filter((line) => Number.isFinite(line.y)),
    [visibleResults, colorMap, speedSeriesFactor],
  );

  const combinedStatsRows = useMemo(() => {
    const perFile = visibleResults.map((item) => ({
      item,
      bodyMassKg: getBodyMassKg(item),
      scopedRows: item.profile?.statistics_rows?.[statisticsScopeMode]?.[eventZoneMode] || [],
    }));
    const metricOrder = [];
    const seenMetrics = new Set();
    perFile.forEach(({ scopedRows }) => {
      scopedRows.forEach((row) => {
        if (!seenMetrics.has(row.metric)) {
          seenMetrics.add(row.metric);
          metricOrder.push(row.metric);
        }
      });
    });
    const rows = [];
    metricOrder.forEach((metricKey) => {
      perFile.forEach(({ item, bodyMassKg, scopedRows }) => {
        const row = scopedRows.find((entry) => entry.metric === metricKey);
        if (!row) return;
        if (
          row.metric === "acceleration" &&
          !isDirectionVisible(hiddenMap, item.name, "acceleration")
        )
          return;
        if (
          row.metric === "deceleration" &&
          !isDirectionVisible(hiddenMap, item.name, "deceleration")
        )
          return;
        const metric =
          isForceProfile && row.metric === "acceleration"
            ? "force_acceleration"
            : isForceProfile && row.metric === "deceleration"
              ? "force_deceleration"
              : row.metric;
        const metricLabel =
          isForceProfile && row.metric === "acceleration"
            ? "Acceleration Force"
            : isForceProfile && row.metric === "deceleration"
              ? "Deceleration Force"
              : row.metric_label;
        rows.push({
          fileName: item.name,
          metricLabel,
          values:
            isForceProfile && row.metric !== "speed"
              ? scaleStatValues(row.values, bodyMassKg)
              : row.values,
          duration: Number(row.duration_seconds || 0),
          metric,
        });
      });
    });
    return rows;
  }, [
    visibleResults,
    hiddenMap,
    statisticsScopeMode,
    eventZoneMode,
    isForceProfile,
    analysisParameters,
  ]);

  const isDirectionVisibleFn = (fileName, direction) =>
    isDirectionVisible(hiddenMap, fileName, direction);

  const fmtEventBinLabel = (label) => formatEventBinLabel(label, eventBinMode, isForceProfile);

  const eventRowsByDirection = useMemo(
    () =>
      Object.fromEntries(
        DIRECTIONS.map((direction) => [
          direction,
          buildDirectionalEventRows({
            direction,
            visibleResults,
            isDirectionVisible: isDirectionVisibleFn,
            eventScopeMode,
            eventZoneMode,
            eventBinMode,
            colorMap,
          }),
        ]),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleResults, hiddenMap, eventScopeMode, eventZoneMode, eventBinMode, colorMap],
  );

  const speedDistributionChart = useMemo(
    () =>
      buildSpeedDistributionChart({
        visibleResults,
        colorMap,
        eventScopeMode,
        eventZoneMode,
        distributionScale,
      }),
    [visibleResults, colorMap, eventScopeMode, eventZoneMode, distributionScale],
  );

  const eventDistributionChartsByDirection = useMemo(
    () =>
      Object.fromEntries(
        DIRECTIONS.map((direction) => [
          direction,
          buildDirectionalEventDistributionChart({
            direction,
            visibleResults,
            isDirectionVisible: isDirectionVisibleFn,
            eventScopeMode,
            eventZoneMode,
            eventBinMode,
            distributionScale,
            colorMap,
            isForceProfile,
          }),
        ]),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      visibleResults,
      hiddenMap,
      eventScopeMode,
      eventZoneMode,
      eventBinMode,
      distributionScale,
      colorMap,
      isForceProfile,
    ],
  );

  return {
    visibleResults,
    allShown,
    shownCount: visibleResults.length,
    canUseAbsoluteTimeAxis,
    xAxisTitle,
    accelerationAspProfiles: aspProfilesByDirection.acceleration,
    decelerationAspProfiles: aspProfilesByDirection.deceleration,
    combinedTimeseries,
    speedReferenceLines,
    combinedStatsRows,
    accelerationEventRows: eventRowsByDirection.acceleration,
    decelerationEventRows: eventRowsByDirection.deceleration,
    speedDistributionChart,
    accelerationDistributionChart: eventDistributionChartsByDirection.acceleration,
    decelerationDistributionChart: eventDistributionChartsByDirection.deceleration,
    metricUnits,
    formatEventBinLabel: fmtEventBinLabel,
  };
}

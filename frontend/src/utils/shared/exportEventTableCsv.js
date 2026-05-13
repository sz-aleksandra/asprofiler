import JSZip from "jszip";

import { buildDirectionalEventRows } from "./analysisRows";
import { createCsvText } from "./downloadCsv";

function formatNumber(value, digits = 2) {
  return value === undefined || value === null || Number.isNaN(value)
    ? ""
    : Number(value).toFixed(digits);
}

function formatSpeedKmh(value) {
  return value === undefined || value === null || Number.isNaN(value)
    ? ""
    : (Number(value) * 3.6).toFixed(2);
}

function formatRatio(numerator, denominator) {
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

function formatText(value) {
  return value === undefined || value === null ? "" : String(value);
}

function formatCoordinate(value) {
  return value === undefined || value === null || Number.isNaN(value) ? "" : Number(value).toFixed(6);
}

function getBodyMassKg(results, fileName, direction) {
  const item = (results || []).find((entry) => entry.name === fileName);
  const profile =
    direction === "acceleration"
      ? item?.profile?.acceleration_profile
      : item?.profile?.deceleration_profile;
  return Number(profile?.meta?.body_mass_kg || 1);
}

function zoneLabel(zone) {
  return zone === "full" ? "full" : zone;
}

function getDirectionPayload(item, direction) {
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

function formatBinRange(value, config = [], multiplier = 1) {
  const label = getBinLabel(value, config);
  const match = config.find((bin) => bin?.label === label);
  if (!match) return "";

  const lower = Number(match.lower) * multiplier;
  const upper = match.upper == null ? null : Number(match.upper) * multiplier;
  if (!Number.isFinite(lower)) return "";

  const formatEdge = (edge) =>
    Number.isInteger(edge) ? String(edge) : String(Number(edge.toFixed(2)));

  if (upper == null || !Number.isFinite(upper)) {
    return `>=${formatEdge(lower)}`;
  }

  return `${formatEdge(lower)}-${formatEdge(upper)}`;
}

function formatConfiguredBinLabel(results, fileName, direction, binMode, label, useForce = false) {
  if (label === "All" || !label) return formatText(label);

  const item = findResultItem(results, fileName);
  const payload = getDirectionPayload(item, direction);
  const config = payload?.config?.bins?.[binMode] || [];
  const match = config.find((bin) => bin?.label === label);
  if (!match) return formatText(label);

  const multiplier = useForce ? getBodyMassKg(results, fileName, direction) : 1;
  const lower = Number(match.lower) * multiplier;
  const upper = match.upper == null ? null : Number(match.upper) * multiplier;
  const formatEdge = (edge) =>
    Number.isInteger(edge) ? String(edge) : String(Number(edge.toFixed(2)));

  if (!Number.isFinite(lower)) return formatText(label);
  if (upper == null || !Number.isFinite(upper)) return `>=${formatEdge(lower)}`;
  return `${formatEdge(lower)}-${formatEdge(upper)}`;
}

function buildOverallRows(results, direction) {
  const headers = [
    "file_name",
    "event_direction",
    "scope",
    "zone",
    "bin_mode",
    "bin_acceleration",
    "bin_force",
    "count",
    "density_per_minute",
    "ratio_to_opposite",
    "mean_duration_s",
    "mean_distance_m",
    "mean_entry_speed_m_per_s",
    "mean_entry_speed_km_per_h",
    "mean_exit_speed_m_per_s",
    "mean_exit_speed_km_per_h",
    "mean_magnitude_m_per_s2",
    "mean_force_n",
    "mean_relative_power_w_per_kg",
    "mean_power_w",
    "mean_impulse_n_s",
    "body_mass_kg",
  ];

  const csvRows = [];
  for (const scope of ["all", "high_speed_running"]) {
    for (const zone of ["full", "left", "middle", "right"]) {
      for (const binMode of ["classic", "detailed"]) {
        const rows = buildDirectionalEventRows({
          direction,
          visibleResults: results || [],
          isDirectionVisible: () => true,
          eventScopeMode: scope,
          eventZoneMode: zone,
          eventBinMode: binMode,
          colorMap: {},
        });

        for (const row of rows) {
          const bodyMassKg = getBodyMassKg(results, row.fileName, direction);
          const values = row.values || {};
          csvRows.push([
            row.fileName,
            direction,
            scope,
            zoneLabel(zone),
            binMode,
            formatConfiguredBinLabel(results, row.fileName, direction, binMode, row.bin, false),
            formatConfiguredBinLabel(results, row.fileName, direction, binMode, row.bin, true),
            formatNumber(values.count, 0),
            formatNumber(values.density_per_minute),
            formatNumber(values.ratio_to_opposite),
            formatNumber(values.mean_duration),
            formatNumber(values.mean_distance),
            formatNumber(values.mean_entry_speed),
            formatSpeedKmh(values.mean_entry_speed),
            formatNumber(values.mean_exit_speed),
            formatSpeedKmh(values.mean_exit_speed),
            formatNumber(values.mean_average_acceleration_magnitude),
            formatNumber(
              values.mean_average_acceleration_magnitude === undefined ||
                values.mean_average_acceleration_magnitude === null
                ? undefined
                : Number(values.mean_average_acceleration_magnitude) * bodyMassKg,
            ),
            formatNumber(values.mean_horizontal_power_per_kilogram),
            formatNumber(
              values.mean_horizontal_power_per_kilogram === undefined ||
                values.mean_horizontal_power_per_kilogram === null
                ? undefined
                : Number(values.mean_horizontal_power_per_kilogram) * bodyMassKg,
            ),
            formatNumber(
              values.mean_horizontal_braking_impulse === undefined ||
                values.mean_horizontal_braking_impulse === null
                ? undefined
                : Math.abs(Number(values.mean_horizontal_braking_impulse)),
            ),
            formatNumber(bodyMassKg),
          ]);
        }
      }
    }
  }

  return { headers, csvRows };
}

function buildEarlyLateRows(results, direction) {
  const headers = [
    "file_name",
    "event_direction",
    "scope",
    "zone",
    "bin_mode",
    "bin_acceleration",
    "bin_force",
    "phase",
    "count",
    "density_per_minute",
    "ratio_to_opposite",
    "mean_entry_speed_m_per_s",
    "mean_entry_speed_km_per_h",
    "mean_exit_speed_m_per_s",
    "mean_exit_speed_km_per_h",
    "mean_duration_s",
    "mean_distance_m",
    "mean_average_magnitude_m_per_s2",
    "mean_average_force_n",
    "mean_peak_magnitude_m_per_s2",
    "mean_peak_force_n",
    "mean_average_relative_power_w_per_kg",
    "mean_average_power_w",
    "mean_peak_relative_power_w_per_kg",
    "mean_peak_power_w",
    "mean_impulse_n_s",
    "body_mass_kg",
  ];

  const csvRows = [];
  const phaseDefs = [
    {
      label: "early",
      get: (values) => ({
        duration: values.mean_first_phase_duration,
        distance: values.mean_first_phase_distance,
        avgMagnitude: values.mean_first_phase_mean_magnitude,
        peakMagnitude: values.mean_first_phase_peak_magnitude,
        avgRelativePower: values.mean_first_phase_mean_power,
        peakRelativePower: values.mean_first_phase_peak_power,
        impulse: values.mean_first_phase_impulse,
      }),
    },
    {
      label: "late",
      get: (values) => ({
        duration: values.mean_second_phase_duration,
        distance: values.mean_second_phase_distance,
        avgMagnitude: values.mean_second_phase_mean_magnitude,
        peakMagnitude: values.mean_second_phase_peak_magnitude,
        avgRelativePower: values.mean_second_phase_mean_power,
        peakRelativePower: values.mean_second_phase_peak_power,
        impulse: values.mean_second_phase_impulse,
      }),
    },
    {
      label: "early_late_ratio",
      get: (values) => ({
        duration: formatRatio(values.mean_first_phase_duration, values.mean_second_phase_duration),
        distance: formatRatio(values.mean_first_phase_distance, values.mean_second_phase_distance),
        avgMagnitude: formatRatio(
          values.mean_first_phase_mean_magnitude,
          values.mean_second_phase_mean_magnitude,
        ),
        peakMagnitude: formatRatio(
          values.mean_first_phase_peak_magnitude,
          values.mean_second_phase_peak_magnitude,
        ),
        avgRelativePower: formatRatio(
          values.mean_first_phase_mean_power,
          values.mean_second_phase_mean_power,
        ),
        peakRelativePower: formatRatio(
          values.mean_first_phase_peak_power,
          values.mean_second_phase_peak_power,
        ),
        impulse: formatRatio(values.mean_first_phase_impulse, values.mean_second_phase_impulse),
      }),
    },
  ];

  for (const scope of ["all", "high_speed_running"]) {
    for (const zone of ["full", "left", "middle", "right"]) {
      for (const binMode of ["classic", "detailed"]) {
        const rows = buildDirectionalEventRows({
          direction,
          visibleResults: results || [],
          isDirectionVisible: () => true,
          eventScopeMode: scope,
          eventZoneMode: zone,
          eventBinMode: binMode,
          colorMap: {},
        });

        for (const row of rows) {
          const bodyMassKg = getBodyMassKg(results, row.fileName, direction);
          const values = row.values || {};
          for (const phaseDef of phaseDefs) {
            const phaseValues = phaseDef.get(values);
            const isRatio = phaseDef.label === "early_late_ratio";
            csvRows.push([
              row.fileName,
              direction,
              scope,
              zoneLabel(zone),
              binMode,
              formatConfiguredBinLabel(results, row.fileName, direction, binMode, row.bin, false),
              formatConfiguredBinLabel(results, row.fileName, direction, binMode, row.bin, true),
              phaseDef.label,
              formatNumber(values.count, 0),
              formatNumber(values.density_per_minute),
              formatNumber(values.ratio_to_opposite),
              formatNumber(values.mean_entry_speed),
              formatSpeedKmh(values.mean_entry_speed),
              formatNumber(values.mean_exit_speed),
              formatSpeedKmh(values.mean_exit_speed),
              isRatio ? phaseValues.duration : formatNumber(phaseValues.duration),
              isRatio ? phaseValues.distance : formatNumber(phaseValues.distance),
              isRatio ? phaseValues.avgMagnitude : formatNumber(phaseValues.avgMagnitude),
              isRatio
                ? phaseValues.avgMagnitude
                : formatNumber(
                    phaseValues.avgMagnitude === undefined || phaseValues.avgMagnitude === null
                      ? undefined
                      : Number(phaseValues.avgMagnitude) * bodyMassKg,
                  ),
              isRatio ? phaseValues.peakMagnitude : formatNumber(phaseValues.peakMagnitude),
              isRatio
                ? phaseValues.peakMagnitude
                : formatNumber(
                    phaseValues.peakMagnitude === undefined || phaseValues.peakMagnitude === null
                      ? undefined
                      : Number(phaseValues.peakMagnitude) * bodyMassKg,
                  ),
              isRatio ? phaseValues.avgRelativePower : formatNumber(phaseValues.avgRelativePower),
              isRatio
                ? phaseValues.avgRelativePower
                : formatNumber(
                    phaseValues.avgRelativePower === undefined ||
                      phaseValues.avgRelativePower === null
                      ? undefined
                      : Number(phaseValues.avgRelativePower) * bodyMassKg,
                  ),
              isRatio ? phaseValues.peakRelativePower : formatNumber(phaseValues.peakRelativePower),
              isRatio
                ? phaseValues.peakRelativePower
                : formatNumber(
                    phaseValues.peakRelativePower === undefined ||
                      phaseValues.peakRelativePower === null
                      ? undefined
                      : Number(phaseValues.peakRelativePower) * bodyMassKg,
                  ),
              isRatio
                ? phaseValues.impulse
                : formatNumber(
                    phaseValues.impulse === undefined || phaseValues.impulse === null
                      ? undefined
                      : Math.abs(Number(phaseValues.impulse)),
                  ),
              formatNumber(bodyMassKg),
            ]);
          }
        }
      }
    }
  }

  return { headers, csvRows };
}

function buildRawEventRows(results, direction) {
  const headers = [
    "file_name",
    "event_direction",
    "scope",
    "zone",
    "event_pitch_zone",
    "start_index",
    "end_index",
    "split_index",
    "midpoint_index",
    "start_time_s",
    "end_time_s",
    "start_absolute_time",
    "end_absolute_time",
    "duration_s",
    "entry_speed_m_per_s",
    "entry_speed_km_per_h",
    "exit_speed_m_per_s",
    "exit_speed_km_per_h",
    "max_speed_m_per_s",
    "max_speed_km_per_h",
    "split_speed_m_per_s",
    "split_speed_km_per_h",
    "peak_acceleration_m_per_s2",
    "peak_force_n",
    "peak_magnitude_m_per_s2",
    "peak_magnitude_force_n",
    "mean_acceleration_m_per_s2",
    "mean_magnitude_m_per_s2",
    "mean_force_n",
    "mean_relative_power_w_per_kg",
    "mean_power_w",
    "distance_m",
    "impulse_m_per_s",
    "impulse_n_s",
    "horizontal_impulse_m_per_s",
    "horizontal_impulse_n_s",
    "body_mass_kg",
    "midpoint_latitude",
    "midpoint_longitude",
    "classic_bin_acceleration",
    "classic_bin_force",
    "detailed_bin_acceleration",
    "detailed_bin_force",
    "first_phase_duration_s",
    "second_phase_duration_s",
    "first_phase_distance_m",
    "second_phase_distance_m",
    "first_phase_mean_magnitude_m_per_s2",
    "second_phase_mean_magnitude_m_per_s2",
    "first_phase_mean_force_n",
    "second_phase_mean_force_n",
    "first_phase_peak_magnitude_m_per_s2",
    "second_phase_peak_magnitude_m_per_s2",
    "first_phase_peak_force_n",
    "second_phase_peak_force_n",
    "first_phase_mean_power_w_per_kg",
    "second_phase_mean_power_w_per_kg",
    "first_phase_mean_power_w",
    "second_phase_mean_power_w",
    "first_phase_peak_power_w_per_kg",
    "second_phase_peak_power_w_per_kg",
    "first_phase_peak_power_w",
    "second_phase_peak_power_w",
    "first_phase_impulse_m_per_s",
    "second_phase_impulse_m_per_s",
    "first_phase_impulse_n_s",
    "second_phase_impulse_n_s",
  ];

  const csvRows = [];
  const scopeMap = [
    { scopeKey: "global", zone: "full" },
    { scopeKey: "left", zone: "left" },
    { scopeKey: "middle", zone: "middle" },
    { scopeKey: "right", zone: "right" },
  ];

  (results || []).forEach((item) => {
    const payload = getDirectionPayload(item, direction);
    const bodyMassKg = getBodyMassKg(results, item.name, direction);
    const classicBins = payload?.config?.bins?.classic || [];
    const detailedBins = payload?.config?.bins?.detailed || [];

    scopeMap.forEach(({ scopeKey, zone }) => {
      ["all", "high_speed_running"].forEach((scope) => {
        const events = payload?.scopes?.[scopeKey]?.[scope]?.events || [];
        events.forEach((event) => {
          const peakMagnitude = Number(event?.peak_magnitude);
          const meanAcceleration = Number(event?.mean_acceleration);
          const meanMagnitude = Number.isFinite(meanAcceleration) ? Math.abs(meanAcceleration) : undefined;
          const meanEventSpeed = (
            Number.isFinite(Number(event?.entry_speed)) && Number.isFinite(Number(event?.exit_speed))
              ? (Number(event.entry_speed) + Number(event.exit_speed)) / 2
              : undefined
          );
          const meanRelativePower =
            Number.isFinite(meanMagnitude) && Number.isFinite(meanEventSpeed)
              ? meanMagnitude * meanEventSpeed
              : undefined;
          const horizontalImpulse = Number(event?.horizontal_braking_impulse);

          csvRows.push([
            item.name,
            direction,
            scope,
            zone,
            formatText(event?.pitch_zone),
            formatNumber(event?.start_index, 0),
            formatNumber(event?.end_index, 0),
            formatNumber(event?.split_index, 0),
            formatNumber(event?.midpoint_index, 0),
            formatNumber(event?.start_time),
            formatNumber(event?.end_time),
            formatText(event?.start_absolute_time),
            formatText(event?.end_absolute_time),
            formatNumber(event?.duration),
            formatNumber(event?.entry_speed),
            formatSpeedKmh(event?.entry_speed),
            formatNumber(event?.exit_speed),
            formatSpeedKmh(event?.exit_speed),
            formatNumber(event?.max_speed),
            formatSpeedKmh(event?.max_speed),
            formatNumber(event?.split_speed),
            formatSpeedKmh(event?.split_speed),
            formatNumber(event?.peak_acceleration),
            formatNumber(
              event?.peak_acceleration === undefined || event?.peak_acceleration === null
                ? undefined
                : Number(event.peak_acceleration) * bodyMassKg,
            ),
            formatNumber(peakMagnitude),
            formatNumber(
              Number.isFinite(peakMagnitude) ? peakMagnitude * bodyMassKg : undefined,
            ),
            formatNumber(event?.mean_acceleration),
            formatNumber(meanMagnitude),
            formatNumber(Number.isFinite(meanMagnitude) ? meanMagnitude * bodyMassKg : undefined),
            formatNumber(meanRelativePower),
            formatNumber(
              Number.isFinite(meanRelativePower) ? meanRelativePower * bodyMassKg : undefined,
            ),
            formatNumber(event?.distance),
            formatNumber(event?.impulse),
            formatNumber(
              event?.impulse === undefined || event?.impulse === null
                ? undefined
                : Number(event.impulse) * bodyMassKg,
            ),
            formatNumber(
              Number.isFinite(horizontalImpulse) ? Math.abs(horizontalImpulse / bodyMassKg) : undefined,
            ),
            formatNumber(
              Number.isFinite(horizontalImpulse) ? Math.abs(horizontalImpulse) : undefined,
            ),
            formatNumber(bodyMassKg),
            formatCoordinate(event?.midpoint_latitude),
            formatCoordinate(event?.midpoint_longitude),
            formatBinRange(peakMagnitude, classicBins, 1),
            formatBinRange(peakMagnitude, classicBins, bodyMassKg),
            formatBinRange(peakMagnitude, detailedBins, 1),
            formatBinRange(peakMagnitude, detailedBins, bodyMassKg),
            formatNumber(event?.first_phase_duration),
            formatNumber(event?.second_phase_duration),
            formatNumber(event?.first_phase_distance),
            formatNumber(event?.second_phase_distance),
            formatNumber(event?.first_phase_mean_magnitude),
            formatNumber(event?.second_phase_mean_magnitude),
            formatNumber(
              event?.first_phase_mean_magnitude === undefined ||
                event?.first_phase_mean_magnitude === null
                ? undefined
                : Number(event.first_phase_mean_magnitude) * bodyMassKg,
            ),
            formatNumber(
              event?.second_phase_mean_magnitude === undefined ||
                event?.second_phase_mean_magnitude === null
                ? undefined
                : Number(event.second_phase_mean_magnitude) * bodyMassKg,
            ),
            formatNumber(event?.first_phase_peak_magnitude),
            formatNumber(event?.second_phase_peak_magnitude),
            formatNumber(
              event?.first_phase_peak_magnitude === undefined ||
                event?.first_phase_peak_magnitude === null
                ? undefined
                : Number(event.first_phase_peak_magnitude) * bodyMassKg,
            ),
            formatNumber(
              event?.second_phase_peak_magnitude === undefined ||
                event?.second_phase_peak_magnitude === null
                ? undefined
                : Number(event.second_phase_peak_magnitude) * bodyMassKg,
            ),
            formatNumber(event?.first_phase_mean_power),
            formatNumber(event?.second_phase_mean_power),
            formatNumber(
              event?.first_phase_mean_power === undefined || event?.first_phase_mean_power === null
                ? undefined
                : Number(event.first_phase_mean_power) * bodyMassKg,
            ),
            formatNumber(
              event?.second_phase_mean_power === undefined ||
                event?.second_phase_mean_power === null
                ? undefined
                : Number(event.second_phase_mean_power) * bodyMassKg,
            ),
            formatNumber(event?.first_phase_peak_power),
            formatNumber(event?.second_phase_peak_power),
            formatNumber(
              event?.first_phase_peak_power === undefined || event?.first_phase_peak_power === null
                ? undefined
                : Number(event.first_phase_peak_power) * bodyMassKg,
            ),
            formatNumber(
              event?.second_phase_peak_power === undefined ||
                event?.second_phase_peak_power === null
                ? undefined
                : Number(event.second_phase_peak_power) * bodyMassKg,
            ),
            formatNumber(
              Number.isFinite(Number(event?.first_phase_impulse))
                ? Math.abs(Number(event.first_phase_impulse) / bodyMassKg)
                : undefined,
            ),
            formatNumber(
              Number.isFinite(Number(event?.second_phase_impulse))
                ? Math.abs(Number(event.second_phase_impulse) / bodyMassKg)
                : undefined,
            ),
            formatNumber(
              event?.first_phase_impulse === undefined || event?.first_phase_impulse === null
                ? undefined
                : Math.abs(Number(event.first_phase_impulse)),
            ),
            formatNumber(
              event?.second_phase_impulse === undefined || event?.second_phase_impulse === null
                ? undefined
                : Math.abs(Number(event.second_phase_impulse)),
            ),
          ]);
        });
      });
    });
  });

  return { headers, csvRows };
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function exportDirectionalEventTablesZip({ results, direction }) {
  const zip = new JSZip();
  const files = buildDirectionalEventExportFiles(results, direction);
  files.forEach((file) => {
    zip.file(file.name, file.content);
  });
  const zipFileName =
    direction === "acceleration"
      ? "acceleration_event_summary.zip"
      : "deceleration_event_summary.zip";

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, zipFileName);
}

export function buildDirectionalEventExportFiles(results, direction) {
  const overallData = buildOverallRows(results, direction);
  const earlyLateData = buildEarlyLateRows(results, direction);
  const rawEventData = buildRawEventRows(results, direction);

  const overallFileName =
    direction === "acceleration"
      ? "acceleration_event_summary.csv"
      : "deceleration_event_summary.csv";
  const earlyLateFileName =
    direction === "acceleration"
      ? "acceleration_event_early_late_summary.csv"
      : "deceleration_event_early_late_summary.csv";
  const rawEventsFileName =
    direction === "acceleration" ? "acceleration_events.csv" : "deceleration_events.csv";

  return [
    {
      name: overallFileName,
      headers: overallData.headers,
      rows: overallData.csvRows,
      content: `\uFEFF${createCsvText(overallData.headers, overallData.csvRows)}\n`,
    },
    {
      name: earlyLateFileName,
      headers: earlyLateData.headers,
      rows: earlyLateData.csvRows,
      content: `\uFEFF${createCsvText(earlyLateData.headers, earlyLateData.csvRows)}\n`,
    },
    {
      name: rawEventsFileName,
      headers: rawEventData.headers,
      rows: rawEventData.csvRows,
      content: `\uFEFF${createCsvText(rawEventData.headers, rawEventData.csvRows)}\n`,
    },
  ];
}

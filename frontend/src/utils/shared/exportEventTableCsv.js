import JSZip from "jszip";

import { formatEventBinLabel } from "../analysis/analysisColumns";
import { buildDirectionalEventRows } from "./analysisRows";
import { createCsvText } from "./downloadCsv";

function formatNumber(value, digits = 2) {
  return value === undefined || value === null || Number.isNaN(value) ? "" : Number(value).toFixed(digits);
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
            formatEventBinLabel(row.bin, binMode, false),
            formatEventBinLabel(row.bin, binMode, true),
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
              formatEventBinLabel(row.bin, binMode, false),
              formatEventBinLabel(row.bin, binMode, true),
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

  const overallFileName =
    direction === "acceleration"
      ? "acceleration_event_summary.csv"
      : "deceleration_event_summary.csv";
  const earlyLateFileName =
    direction === "acceleration"
      ? "acceleration_event_early_late_summary.csv"
      : "deceleration_event_early_late_summary.csv";

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
  ];
}

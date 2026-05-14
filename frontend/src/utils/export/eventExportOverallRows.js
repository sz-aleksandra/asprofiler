import {
  formatConfiguredBinLabel,
  formatNumber,
  formatSpeedKmh,
  getBodyMassKg,
  zoneLabel,
} from "./eventExportFormatters";
import {
  absoluteValue,
  EVENT_BIN_MODES,
  EVENT_SCOPES,
  EVENT_ZONES,
  getDirectionalRows,
  scaledByMass,
} from "./eventExportShared";

export function buildOverallRows(results, direction) {
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
  for (const scope of EVENT_SCOPES) {
    for (const zone of EVENT_ZONES) {
      for (const binMode of EVENT_BIN_MODES) {
        for (const row of getDirectionalRows(results, direction, scope, zone, binMode)) {
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
            formatNumber(scaledByMass(values.mean_average_acceleration_magnitude, bodyMassKg)),
            formatNumber(values.mean_horizontal_power_per_kilogram),
            formatNumber(scaledByMass(values.mean_horizontal_power_per_kilogram, bodyMassKg)),
            formatNumber(absoluteValue(values.mean_horizontal_braking_impulse)),
            formatNumber(bodyMassKg),
          ]);
        }
      }
    }
  }

  return { headers, csvRows };
}

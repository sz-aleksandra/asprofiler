import {
  formatConfiguredBinLabel,
  formatNumber,
  formatRatio,
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

function getPhaseDefinitions() {
  return [
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
}

export function buildEarlyLateRows(results, direction) {
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
  for (const scope of EVENT_SCOPES) {
    for (const zone of EVENT_ZONES) {
      for (const binMode of EVENT_BIN_MODES) {
        for (const row of getDirectionalRows(results, direction, scope, zone, binMode)) {
          const bodyMassKg = getBodyMassKg(results, row.fileName, direction);
          const values = row.values || {};
          for (const phaseDef of getPhaseDefinitions()) {
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
                : formatNumber(scaledByMass(phaseValues.avgMagnitude, bodyMassKg)),
              isRatio ? phaseValues.peakMagnitude : formatNumber(phaseValues.peakMagnitude),
              isRatio
                ? phaseValues.peakMagnitude
                : formatNumber(scaledByMass(phaseValues.peakMagnitude, bodyMassKg)),
              isRatio ? phaseValues.avgRelativePower : formatNumber(phaseValues.avgRelativePower),
              isRatio
                ? phaseValues.avgRelativePower
                : formatNumber(scaledByMass(phaseValues.avgRelativePower, bodyMassKg)),
              isRatio ? phaseValues.peakRelativePower : formatNumber(phaseValues.peakRelativePower),
              isRatio
                ? phaseValues.peakRelativePower
                : formatNumber(scaledByMass(phaseValues.peakRelativePower, bodyMassKg)),
              isRatio ? phaseValues.impulse : formatNumber(absoluteValue(phaseValues.impulse)),
              formatNumber(bodyMassKg),
            ]);
          }
        }
      }
    }
  }

  return { headers, csvRows };
}

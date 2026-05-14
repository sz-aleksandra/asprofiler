import {
  formatBinRange,
  formatCoordinate,
  formatNumber,
  formatSpeedKmh,
  formatText,
  getBodyMassKg,
  getDirectionPayload,
} from "./eventExportFormatters";
import { absoluteValue, EVENT_SCOPES, RAW_SCOPE_MAP, scaledByMass } from "./eventExportShared";

export function buildRawEventRows(results, direction) {
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
  (results || []).forEach((item) => {
    const payload = getDirectionPayload(item, direction);
    const bodyMassKg = getBodyMassKg(results, item.name, direction);
    const classicBins = payload?.config?.bins?.classic || [];
    const detailedBins = payload?.config?.bins?.detailed || [];

    RAW_SCOPE_MAP.forEach(({ scopeKey, zone }) => {
      EVENT_SCOPES.forEach((scope) => {
        const events = payload?.scopes?.[scopeKey]?.[scope]?.events || [];
        events.forEach((event) => {
          const peakMagnitude = Number(event?.peak_magnitude);
          const meanAcceleration = Number(event?.mean_acceleration);
          const meanMagnitude = Number.isFinite(meanAcceleration)
            ? Math.abs(meanAcceleration)
            : undefined;
          const meanEventSpeed =
            Number.isFinite(Number(event?.entry_speed)) &&
            Number.isFinite(Number(event?.exit_speed))
              ? (Number(event.entry_speed) + Number(event.exit_speed)) / 2
              : undefined;
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
            formatNumber(scaledByMass(event?.peak_acceleration, bodyMassKg)),
            formatNumber(peakMagnitude),
            formatNumber(Number.isFinite(peakMagnitude) ? scaledByMass(peakMagnitude, bodyMassKg) : undefined),
            formatNumber(event?.mean_acceleration),
            formatNumber(meanMagnitude),
            formatNumber(Number.isFinite(meanMagnitude) ? scaledByMass(meanMagnitude, bodyMassKg) : undefined),
            formatNumber(meanRelativePower),
            formatNumber(
              Number.isFinite(meanRelativePower) ? scaledByMass(meanRelativePower, bodyMassKg) : undefined,
            ),
            formatNumber(event?.distance),
            formatNumber(event?.impulse),
            formatNumber(scaledByMass(event?.impulse, bodyMassKg)),
            formatNumber(
              Number.isFinite(horizontalImpulse)
                ? Math.abs(horizontalImpulse / bodyMassKg)
                : undefined,
            ),
            formatNumber(Number.isFinite(horizontalImpulse) ? Math.abs(horizontalImpulse) : undefined),
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
            formatNumber(scaledByMass(event?.first_phase_mean_magnitude, bodyMassKg)),
            formatNumber(scaledByMass(event?.second_phase_mean_magnitude, bodyMassKg)),
            formatNumber(event?.first_phase_peak_magnitude),
            formatNumber(event?.second_phase_peak_magnitude),
            formatNumber(scaledByMass(event?.first_phase_peak_magnitude, bodyMassKg)),
            formatNumber(scaledByMass(event?.second_phase_peak_magnitude, bodyMassKg)),
            formatNumber(event?.first_phase_mean_power),
            formatNumber(event?.second_phase_mean_power),
            formatNumber(scaledByMass(event?.first_phase_mean_power, bodyMassKg)),
            formatNumber(scaledByMass(event?.second_phase_mean_power, bodyMassKg)),
            formatNumber(event?.first_phase_peak_power),
            formatNumber(event?.second_phase_peak_power),
            formatNumber(scaledByMass(event?.first_phase_peak_power, bodyMassKg)),
            formatNumber(scaledByMass(event?.second_phase_peak_power, bodyMassKg)),
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
            formatNumber(absoluteValue(event?.first_phase_impulse)),
            formatNumber(absoluteValue(event?.second_phase_impulse)),
          ]);
        });
      });
    });
  });

  return { headers, csvRows };
}

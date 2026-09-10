import {
  EVENT_BIN_DEFS,
  PITCH_ZONE_OPTIONS,
  ACTIVITY_SCOPE_OPTIONS,
} from "../../../analysis/constants";
import {
  formatBinRange,
  secondsToTime,
  relativeTimeSeriesToAbsoluteTimes,
  safeScaleByMass,
} from "../../../analysis/formatters";

const RAW_EVENT_EXPORT_HEADERS = [
  "file_name",
  "event_acc_dec_direction",
  "activity_scope",
  "pitch_zone",
  "start_index",
  "end_index",
  "split_index",
  "start_time_s",
  "end_time_s",
  "start_absolute_time",
  "end_absolute_time",
  "duration_s",
  "entry_speed_m_per_s",
  "exit_speed_m_per_s",
  "peak_magnitude_m_per_s2",
  "peak_magnitude_force_n",
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
  "classic_bin_acc",
  "classic_bin_force",
  "detailed_bin_acc",
  "detailed_bin_force",
  "early_duration_s",
  "late_duration_s",
  "early_distance_m",
  "late_distance_m",
  "early_mean_magnitude_m_per_s2",
  "late_mean_magnitude_m_per_s2",
  "early_mean_force_n",
  "late_mean_force_n",
  "early_peak_magnitude_m_per_s2",
  "late_peak_magnitude_m_per_s2",
  "early_peak_force_n",
  "late_peak_force_n",
  "early_mean_relative_power_w_per_kg",
  "late_mean_relative_power_w_per_kg",
  "early_mean_power_w",
  "late_mean_power_w",
  "early_peak_relative_power_w_per_kg",
  "late_peak_relative_power_w_per_kg",
  "early_peak_power_w",
  "late_peak_power_w",
  "early_impulse_m_per_s",
  "late_impulse_m_per_s",
  "early_impulse_n_s",
  "late_impulse_n_s",
];

function formatEventBinRange(peakMagnitude, binDefs, bodyMass, binMetric) {
  const peakForceOrMagnitude = binMetric === "force" ? peakMagnitude * bodyMass : peakMagnitude;
  const matchingBin = binDefs.find(
    (binDef) =>
      peakForceOrMagnitude >= binDef.binLowerBound &&
      (binDef.binUpperBound == null || peakForceOrMagnitude < binDef.binUpperBound),
  );
  return formatBinRange(matchingBin);
}

export function buildRawEventsExport(analysisResults, accDecDirection) {
  const rawEventExportRows = [];
  for (const analysisResult of analysisResults) {
    const absoluteTimes = relativeTimeSeriesToAbsoluteTimes(analysisResult.analysis.time_series);

    for (const { value: pitchZone } of PITCH_ZONE_OPTIONS) {
      for (const { value: activityScope } of ACTIVITY_SCOPE_OPTIONS) {
        for (const event of analysisResult.analysis[`${accDecDirection}_events`][pitchZone][
          activityScope
        ].events) {
          rawEventExportRows.push([
            analysisResult.file_name,
            accDecDirection,
            activityScope,
            pitchZone,
            event.start_index,
            event.end_index,
            event.split_index,
            analysisResult.analysis.time_series.relative_times[event.start_index],
            analysisResult.analysis.time_series.relative_times[event.end_index],
            secondsToTime(absoluteTimes[event.start_index]),
            secondsToTime(absoluteTimes[event.end_index]),
            event.duration,
            event.entry_speed,
            event.exit_speed,
            event.peak_magnitude,
            safeScaleByMass(event.peak_magnitude, analysisResult.analysis.meta.body_mass_kg),
            event.mean_magnitude,
            safeScaleByMass(event.mean_magnitude, analysisResult.analysis.meta.body_mass_kg),
            event.mean_relative_power_w_per_kg,
            safeScaleByMass(
              event.mean_relative_power_w_per_kg,
              analysisResult.analysis.meta.body_mass_kg,
            ),
            event.distance,
            event.impulse,
            safeScaleByMass(event.impulse, analysisResult.analysis.meta.body_mass_kg),
            Math.abs(event.horizontal_impulse),
            safeScaleByMass(
              Math.abs(event.horizontal_impulse),
              analysisResult.analysis.meta.body_mass_kg,
            ),
            analysisResult.analysis.meta.body_mass_kg,
            formatEventBinRange(
              event.peak_magnitude,
              EVENT_BIN_DEFS.classic.acc,
              analysisResult.analysis.meta.body_mass_kg,
              "acc",
            ),
            formatEventBinRange(
              event.peak_magnitude,
              EVENT_BIN_DEFS.classic.force,
              analysisResult.analysis.meta.body_mass_kg,
              "force",
            ),
            formatEventBinRange(
              event.peak_magnitude,
              EVENT_BIN_DEFS.detailed.acc,
              analysisResult.analysis.meta.body_mass_kg,
              "acc",
            ),
            formatEventBinRange(
              event.peak_magnitude,
              EVENT_BIN_DEFS.detailed.force,
              analysisResult.analysis.meta.body_mass_kg,
              "force",
            ),
            event.early_duration,
            event.late_duration,
            event.early_distance,
            event.late_distance,
            event.early_mean_magnitude,
            event.late_mean_magnitude,
            safeScaleByMass(event.early_mean_magnitude, analysisResult.analysis.meta.body_mass_kg),
            safeScaleByMass(event.late_mean_magnitude, analysisResult.analysis.meta.body_mass_kg),
            event.early_peak_magnitude,
            event.late_peak_magnitude,
            safeScaleByMass(event.early_peak_magnitude, analysisResult.analysis.meta.body_mass_kg),
            safeScaleByMass(event.late_peak_magnitude, analysisResult.analysis.meta.body_mass_kg),
            event.early_mean_relative_power_w_per_kg,
            event.late_mean_relative_power_w_per_kg,
            safeScaleByMass(
              event.early_mean_relative_power_w_per_kg,
              analysisResult.analysis.meta.body_mass_kg,
            ),
            safeScaleByMass(
              event.late_mean_relative_power_w_per_kg,
              analysisResult.analysis.meta.body_mass_kg,
            ),
            event.early_peak_relative_power_w_per_kg,
            event.late_peak_relative_power_w_per_kg,
            safeScaleByMass(
              event.early_peak_relative_power_w_per_kg,
              analysisResult.analysis.meta.body_mass_kg,
            ),
            safeScaleByMass(
              event.late_peak_relative_power_w_per_kg,
              analysisResult.analysis.meta.body_mass_kg,
            ),
            Math.abs(event.early_impulse),
            Math.abs(event.late_impulse),
            safeScaleByMass(
              Math.abs(event.early_impulse),
              analysisResult.analysis.meta.body_mass_kg,
            ),
            safeScaleByMass(
              Math.abs(event.late_impulse),
              analysisResult.analysis.meta.body_mass_kg,
            ),
          ]);
        }
      }
    }
  }

  return { headers: RAW_EVENT_EXPORT_HEADERS, rows: rawEventExportRows };
}

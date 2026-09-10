import { binLabelToRangeText, safeAbs, safeScaleByMass } from "../../../analysis/formatters";
import { iterateEventRowsForAccDecDirection } from "../../tables/rows";
const SHARED_EVENT_STATS_EXPORT_HEADERS = [
  "file_name",
  "event_acc_dec_direction",
  "activity_scope",
  "pitch_zone",
  "bin_mode",
  "bin_metric",
  "bin_label",
  "bin_range",
];
const ENTIRE_EVENT_STATS_EXPORT_HEADERS = [
  ...SHARED_EVENT_STATS_EXPORT_HEADERS,
  "count",
  "density_per_min",
  "ratio_to_opposite",
  "mean_duration_s",
  "mean_distance_m",
  "mean_entry_speed_m_per_s",
  "mean_exit_speed_m_per_s",
  "mean_magnitude_m_per_s2",
  "mean_force_n",
  "mean_relative_power_w_per_kg",
  "mean_power_w",
  "mean_impulse_n_s",
  "body_mass_kg",
];
const EVENT_PHASE_FIELDS = [
  {
    key: "duration",
    suffix: "duration",
  },
  {
    key: "distance",
    suffix: "distance",
  },
  {
    key: "avgMagnitude",
    suffix: "mean_magnitude",
  },
  {
    key: "peakMagnitude",
    suffix: "peak_magnitude",
  },
  {
    key: "avgRelativePower",
    suffix: "mean_relative_power_w_per_kg",
  },
  {
    key: "peakRelativePower",
    suffix: "peak_relative_power_w_per_kg",
  },
  {
    key: "impulse",
    suffix: "impulse",
  },
];
const EARLY_LATE_EVENT_STATS_EXPORT_HEADERS = [
  ...SHARED_EVENT_STATS_EXPORT_HEADERS,
  "phase",
  "count",
  "density_per_min",
  "ratio_to_opposite",
  "mean_entry_speed_m_per_s",
  "mean_exit_speed_m_per_s",
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
const EVENT_PHASE_DEFS = [
  {
    phaseLabel: "early",
    buildPhaseStatValues: (eventStats) =>
      Object.fromEntries(
        EVENT_PHASE_FIELDS.map((phaseField) => [
          phaseField.key,
          eventStats[`mean_early_${phaseField.suffix}`],
        ]),
      ),
  },
  {
    phaseLabel: "late",
    buildPhaseStatValues: (eventStats) =>
      Object.fromEntries(
        EVENT_PHASE_FIELDS.map((phaseField) => [
          phaseField.key,
          eventStats[`mean_late_${phaseField.suffix}`],
        ]),
      ),
  },
  {
    phaseLabel: "early_late_ratio",
    buildPhaseStatValues: (eventStats) =>
      Object.fromEntries(
        EVENT_PHASE_FIELDS.map((phaseField) => {
          const numerator = eventStats[`mean_early_${phaseField.suffix}`];
          const denominator = eventStats[`mean_late_${phaseField.suffix}`];
          return [
            phaseField.key,
            numerator == null || denominator == null || denominator === 0
              ? null
              : numerator / denominator,
          ];
        }),
      ),
  },
];
function buildSharedEventStatsExportRowPrefix({
  eventRow,
  accDecDirection,
  eventActivityScopeMode,
  pitchZoneMode,
  binMode,
  binMetric,
}) {
  return [
    eventRow.fileName,
    accDecDirection,
    eventActivityScopeMode,
    pitchZoneMode,
    binMode,
    binMetric,
    eventRow.binLabel,
    binLabelToRangeText(eventRow.binLabel, binMode, binMetric),
  ];
}
export function buildEntireEventsStatsExportForAccDecDirection(analysisResults, accDecDirection) {
  const entireEventStatsExportRows = [];
  for (const eventStatsRowContext of iterateEventRowsForAccDecDirection(
    analysisResults,
    accDecDirection,
  )) {
    const eventRow = eventStatsRowContext.row;
    const eventStats = eventRow.stats;
    const entireEventStatsExportRow = [
      ...buildSharedEventStatsExportRowPrefix({
        ...eventStatsRowContext,
        eventRow,
        accDecDirection,
      }),
      eventStats.count,
      eventStats.density_per_min,
      eventStats.ratio_to_opposite,
      eventStats.mean_duration,
      eventStats.mean_distance,
      eventStats.mean_entry_speed,
      eventStats.mean_exit_speed,
      eventStats.mean_magnitude,
      safeScaleByMass(eventStats.mean_magnitude, eventStatsRowContext.bodyMass),
      eventStats.mean_relative_power_w_per_kg,
      safeScaleByMass(eventStats.mean_relative_power_w_per_kg, eventStatsRowContext.bodyMass),
      safeScaleByMass(safeAbs(eventStats.mean_horizontal_impulse), eventStatsRowContext.bodyMass),
      eventStatsRowContext.bodyMass,
    ];
    entireEventStatsExportRows.push(entireEventStatsExportRow);
  }
  return {
    headers: ENTIRE_EVENT_STATS_EXPORT_HEADERS,
    rows: entireEventStatsExportRows,
  };
}
export function buildEarlyLateEventsStatsExportForAccDecDirection(
  analysisResults,
  accDecDirection,
) {
  const earlyLateEventStatsExportRows = [];
  for (const eventStatsRowContext of iterateEventRowsForAccDecDirection(
    analysisResults,
    accDecDirection,
  )) {
    const eventRow = eventStatsRowContext.row;
    const eventStats = eventRow.stats;
    const sharedEventStatsExportRowPrefix = buildSharedEventStatsExportRowPrefix({
      ...eventStatsRowContext,
      eventRow,
      accDecDirection,
    });
    const sharedEventStatsValues = [
      eventStats.count,
      eventStats.density_per_min,
      eventStats.ratio_to_opposite,
      eventStats.mean_entry_speed,
      eventStats.mean_exit_speed,
    ];
    for (const eventPhaseDef of EVENT_PHASE_DEFS) {
      const phaseStatValues = eventPhaseDef.buildPhaseStatValues(eventStats);
      const isRatioRow = eventPhaseDef.phaseLabel === "early_late_ratio";
      const earlyLateEventStatsExportRow = [
        ...sharedEventStatsExportRowPrefix,
        eventPhaseDef.phaseLabel,
        ...sharedEventStatsValues,
        phaseStatValues.duration,
        phaseStatValues.distance,
        phaseStatValues.avgMagnitude,
        isRatioRow
          ? phaseStatValues.avgMagnitude
          : safeScaleByMass(phaseStatValues.avgMagnitude, eventStatsRowContext.bodyMass),
        phaseStatValues.peakMagnitude,
        isRatioRow
          ? phaseStatValues.peakMagnitude
          : safeScaleByMass(phaseStatValues.peakMagnitude, eventStatsRowContext.bodyMass),
        phaseStatValues.avgRelativePower,
        isRatioRow
          ? phaseStatValues.avgRelativePower
          : safeScaleByMass(phaseStatValues.avgRelativePower, eventStatsRowContext.bodyMass),
        phaseStatValues.peakRelativePower,
        isRatioRow
          ? phaseStatValues.peakRelativePower
          : safeScaleByMass(phaseStatValues.peakRelativePower, eventStatsRowContext.bodyMass),
        isRatioRow
          ? phaseStatValues.impulse
          : safeScaleByMass(safeAbs(phaseStatValues.impulse), eventStatsRowContext.bodyMass),
        eventStatsRowContext.bodyMass,
      ];
      earlyLateEventStatsExportRows.push(earlyLateEventStatsExportRow);
    }
  }
  return {
    headers: EARLY_LATE_EVENT_STATS_EXPORT_HEADERS,
    rows: earlyLateEventStatsExportRows,
  };
}

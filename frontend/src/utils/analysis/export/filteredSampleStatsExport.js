import {
  PITCH_ZONE_OPTIONS,
  ACTIVITY_SCOPE_OPTIONS,
  ACC_DEC_DIRECTIONS,
} from "../../analysis/constants";
import { safeScaleByMass } from "../../analysis/formatters";

import { buildCsvFile } from "./output";

const CSV_HEADERS = [
  "file_name",
  "activity_scope",
  "pitch_zone",
  "metric",
  "unit",
  "min",
  "mean",
  "median",
  "max",
  "area",
  "area_unit",
  "duration_s",
  "body_mass_kg",
];

export function buildFilteredSampleStatsExportFile(analysisResults) {
  const exportRows = [];

  for (const analysisResult of analysisResults) {
    const bodyMass = analysisResult.analysis.meta.body_mass_kg;

    for (const { value: activityScope } of ACTIVITY_SCOPE_OPTIONS) {
      for (const { value: pitchZone } of PITCH_ZONE_OPTIONS) {
        const activityScopeSampleStats =
          analysisResult.analysis.sample_stats[pitchZone][activityScope];
        const buildSampleStatsCsvRow = (
          metricKey,
          statUnit,
          statAreaUnit,
          activityScopeMetricSampleStats,
          transformStatValue = (statValue) => statValue,
        ) => [
          analysisResult.file_name,
          activityScope,
          pitchZone,
          metricKey,
          statUnit,
          transformStatValue(activityScopeMetricSampleStats.min),
          transformStatValue(activityScopeMetricSampleStats.mean),
          transformStatValue(activityScopeMetricSampleStats.median),
          transformStatValue(activityScopeMetricSampleStats.max),
          transformStatValue(activityScopeMetricSampleStats.area),
          statAreaUnit,
          activityScopeSampleStats.duration,
          bodyMass,
        ];

        exportRows.push(
          buildSampleStatsCsvRow("speed", "m_per_s", "m", activityScopeSampleStats.speed),
        );
        for (const accDecDirection of ACC_DEC_DIRECTIONS) {
          const accDecDirectionSampleStats = activityScopeSampleStats[accDecDirection];
          exportRows.push(
            buildSampleStatsCsvRow(
              accDecDirection,
              "m_per_s2",
              "m_per_s",
              accDecDirectionSampleStats,
            ),
            buildSampleStatsCsvRow(
              `${accDecDirection}_force`,
              "N",
              "N_s",
              accDecDirectionSampleStats,
              (statValue) => safeScaleByMass(statValue, bodyMass),
            ),
          );
        }
      }
    }
  }

  return buildCsvFile("filtered_sample_stats.csv", CSV_HEADERS, exportRows);
}

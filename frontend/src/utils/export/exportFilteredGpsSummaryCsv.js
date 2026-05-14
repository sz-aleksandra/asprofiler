import { downloadCsv, toCsvFile } from "../shared/csvExportUtils";
import {
  formatDuration,
  formatNumber,
  formatSpeedKmh,
  scaleToForce,
  scopeLabel,
  zoneLabel,
} from "../shared/csvFormatters";

export function exportFilteredGpsSummaryCsv(results) {
  const file = buildFilteredGpsSummaryFile(results);
  downloadCsv(file.headers, file.rows, file.name);
}

export function buildFilteredGpsSummaryFile(results) {
  const headers = [
    "file_name",
    "scope",
    "zone",
    "metric",
    "duration",
    "body_mass_kg",
    "min_m_per_s",
    "min_km_per_h",
    "min_m_per_s2",
    "min_n",
    "mean_m_per_s",
    "mean_km_per_h",
    "mean_m_per_s2",
    "mean_n",
    "median_m_per_s",
    "median_km_per_h",
    "median_m_per_s2",
    "median_n",
    "max_m_per_s",
    "max_km_per_h",
    "max_m_per_s2",
    "max_n",
    "area_km",
    "area_m_per_s",
    "area_n_s",
  ];

  const rows = [];
  for (const item of results || []) {
    const statisticsRows = item?.profile?.statistics_rows || {};
    const bodyMassKg = Number(item?.profile?.acceleration_profile?.meta?.body_mass_kg || 1);
    for (const scope of ["all", "high_speed_running"]) {
      for (const zone of ["full", "left", "middle", "right"]) {
        const scopedRows = statisticsRows?.[scope]?.[zone] || [];
        for (const row of scopedRows) {
          const values = row.values || {};
          const isSpeed = row.metric === "speed";
          rows.push([
            item.name,
            scopeLabel(scope),
            zoneLabel(zone),
            row.metric,
            formatDuration(row.duration_seconds),
            formatNumber(bodyMassKg),
            isSpeed ? formatNumber(values.min) : "",
            isSpeed ? formatSpeedKmh(values.min) : "",
            !isSpeed ? formatNumber(values.min) : "",
            !isSpeed ? scaleToForce(values.min, bodyMassKg) : "",
            isSpeed ? formatNumber(values.mean) : "",
            isSpeed ? formatSpeedKmh(values.mean) : "",
            !isSpeed ? formatNumber(values.mean) : "",
            !isSpeed ? scaleToForce(values.mean, bodyMassKg) : "",
            isSpeed ? formatNumber(values.median) : "",
            isSpeed ? formatSpeedKmh(values.median) : "",
            !isSpeed ? formatNumber(values.median) : "",
            !isSpeed ? scaleToForce(values.median, bodyMassKg) : "",
            isSpeed ? formatNumber(values.max) : "",
            isSpeed ? formatSpeedKmh(values.max) : "",
            !isSpeed ? formatNumber(values.max) : "",
            !isSpeed ? scaleToForce(values.max, bodyMassKg) : "",
            isSpeed ? formatNumber(values.area) : "",
            !isSpeed ? formatNumber(values.area) : "",
            !isSpeed ? scaleToForce(values.area, bodyMassKg) : "",
          ]);
        }
      }
    }
  }

  return toCsvFile("filtered_gps_summary.csv", headers, rows);
}

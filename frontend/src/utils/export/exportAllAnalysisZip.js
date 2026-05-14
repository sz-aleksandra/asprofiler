import { downloadZip } from "../shared/csvExportUtils";
import { toKmh } from "../shared/csvFormatters";
import { buildAspExportFiles } from "./exportAspCsv";
import { buildDirectionalEventExportFiles } from "./exportEventTableCsv";
import { buildFilteredGpsSummaryFile } from "./exportFilteredGpsSummaryCsv";

function normalizeAnalysisParameters(parameters = {}) {
  return {
    minimum_acceleration_speed_m_per_s: parameters.min_speed,
    minimum_acceleration_speed_km_per_h: toKmh(parameters.min_speed),
    minimum_deceleration_speed_m_per_s: parameters.deceleration_min_speed,
    minimum_deceleration_speed_km_per_h: toKmh(parameters.deceleration_min_speed),
    bin_size_m_per_s: parameters.bin_size,
    extreme_n: parameters.extreme_n,
    confidence_level: parameters.confidence_level,
    body_mass_kg: parameters.body_mass_kg,
    minimum_acceleration_for_event_start_m_per_s2:
      parameters.minimum_acceleration_for_event_start,
    minimum_deceleration_for_event_start_m_per_s2:
      parameters.minimum_deceleration_for_event_start,
    minimum_event_duration_s: parameters.minimum_event_duration_seconds,
    minimum_high_speed_running_duration_s: parameters.minimum_high_speed_running_duration_seconds,
    minimum_high_speed_running_speed_m_per_s:
      parameters.minimum_high_speed_running_speed_meters_per_second,
    minimum_high_speed_running_speed_km_per_h: toKmh(
      parameters.minimum_high_speed_running_speed_meters_per_second,
    ),
  };
}

function normalizePerFileParameters(perFileParameters = {}) {
  return Object.fromEntries(
    Object.entries(perFileParameters).map(([fileName, parameters]) => [
      fileName,
      normalizeAnalysisParameters(parameters),
    ]),
  );
}

function normalizePreprocessingParameters(parameters = {}) {
  return {
    filter_window_samples: parameters.filter_window,
    filter_mode: parameters.filter_mode,
    maximum_horizontal_accuracy_m: parameters.maximum_horizontal_accuracy_meters,
    maximum_horizontal_dilution_of_precision: parameters.maximum_horizontal_dilution_of_precision,
    minimum_satellites_count: parameters.minimum_satellites,
  };
}

export async function exportAllAnalysisZip({
  results,
  analysisParameters = {},
  preprocessingParameters = {},
  perFileParameters = {},
}) {
  await downloadZip(
    buildAllAnalysisZipFiles({
      results,
      analysisParameters,
      preprocessingParameters,
      perFileParameters,
    }),
    "analysis.zip",
  );
}

export function buildAllAnalysisZipFiles({
  results,
  analysisParameters = {},
  preprocessingParameters = {},
  perFileParameters = {},
}) {
  const filteredGpsSummary = buildFilteredGpsSummaryFile(results);
  return [
    ...buildAspExportFiles(results),
    filteredGpsSummary,
    ...buildDirectionalEventExportFiles(results, "acceleration"),
    ...buildDirectionalEventExportFiles(results, "deceleration"),
    {
      name: "analysis_parameters.json",
      content: `${JSON.stringify(
        {
          analysis_parameters: normalizeAnalysisParameters(analysisParameters),
          per_file_parameters: normalizePerFileParameters(perFileParameters),
          preprocessing_parameters: normalizePreprocessingParameters(preprocessingParameters),
        },
        null,
        2,
      )}\n`,
    },
  ];
}

export function buildAllAnalysisZip(
  zip,
  { results, analysisParameters = {}, preprocessingParameters = {}, perFileParameters = {} },
) {
  buildAllAnalysisZipFiles({
    results,
    analysisParameters,
    preprocessingParameters,
    perFileParameters,
  }).forEach((file) => {
    zip.file(file.name, file.content);
  });
  return zip;
}

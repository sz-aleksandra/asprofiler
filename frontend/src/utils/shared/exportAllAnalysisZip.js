import JSZip from "jszip";

import { buildAspExportFiles } from "./exportAspCsv";
import { buildDirectionalEventExportFiles } from "./exportEventTableCsv";
import { buildFilteredGpsSummaryFile } from "./exportFilteredGpsSummaryCsv";

function toKmh(value) {
  return value === undefined || value === null || Number.isNaN(value)
    ? value
    : Number(value) * 3.6;
}

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

export async function exportAllAnalysisZip({
  results,
  analysisParameters = {},
  preprocessingParameters = {},
  perFileParameters = {},
}) {
  const zip = new JSZip();
  buildAllAnalysisZip(zip, {
    results,
    analysisParameters,
    preprocessingParameters,
    perFileParameters,
  });

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, "analysis.zip");
}

export function buildAllAnalysisZip(
  zip,
  { results, analysisParameters = {}, preprocessingParameters = {}, perFileParameters = {} },
) {
  buildAspExportFiles(results).forEach((file) => {
    zip.file(file.name, file.content);
  });

  const filteredGpsSummary = buildFilteredGpsSummaryFile(results);
  zip.file(filteredGpsSummary.name, filteredGpsSummary.content);

  buildDirectionalEventExportFiles(results, "acceleration").forEach((file) => {
    zip.file(file.name, file.content);
  });

  buildDirectionalEventExportFiles(results, "deceleration").forEach((file) => {
    zip.file(file.name, file.content);
  });

  zip.file(
    "analysis_parameters.json",
    `${JSON.stringify(
      {
        analysis_parameters: normalizeAnalysisParameters(analysisParameters),
        per_file_parameters: normalizePerFileParameters(perFileParameters),
        preprocessing_parameters: normalizePreprocessingParameters(preprocessingParameters),
      },
      null,
      2,
    )}\n`,
  );

  return zip;
}

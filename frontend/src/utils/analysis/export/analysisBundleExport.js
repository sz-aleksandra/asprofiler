import { ACC_DEC_DIRECTIONS } from "../../analysis/constants";

import { buildAnalysisProfileExportFiles } from "./accDecDirectionAnalysisProfileExport";
import { buildEventsExportFilesForAccDecDirection } from "./events/eventsBundleExport";
import { buildFilteredSampleStatsExportFile } from "./filteredSampleStatsExport";
import { downloadZip } from "./output";
export async function exportAnalysis({
  analysisParams,
  analysisResults,
  csvFilterParams,
  preprocessingParams,
}) {
  const buildArchiveEntriesForFolder = (archiveFiles, folderPath) =>
    archiveFiles.map((archiveFile) => ({
      name: `${folderPath}/${archiveFile.name}`,
      content: archiveFile.content,
    }));
  const archiveEntries = [
    {
      name: "analysis_params.json",
      content: `${JSON.stringify(
        {
          analysis_params: analysisParams,
          per_file_params: Object.fromEntries(
            analysisResults.map((analysisResult) => [
              analysisResult.file_name,
              analysisResult.analysis.meta,
            ]),
          ),
          csv_filter_params: csvFilterParams,
          preprocessing_params: preprocessingParams,
        },
        null,
        2,
      )}\n`,
    },
    ...buildArchiveEntriesForFolder(
      buildAnalysisProfileExportFiles(analysisResults),
      "analysisProfile",
    ),
    ...buildArchiveEntriesForFolder([buildFilteredSampleStatsExportFile(analysisResults)], "stats"),
    ...ACC_DEC_DIRECTIONS.flatMap((accDecDirection) =>
      buildArchiveEntriesForFolder(
        buildEventsExportFilesForAccDecDirection(analysisResults, accDecDirection),
        `events/${accDecDirection}`,
      ),
    ),
  ];
  await downloadZip(archiveEntries, "analysis.zip");
}

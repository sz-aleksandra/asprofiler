import { buildCsvFile } from "../output";

import {
  buildEarlyLateEventsStatsExportForAccDecDirection,
  buildEntireEventsStatsExportForAccDecDirection,
} from "./eventsStatsExport";
import { buildRawEventsExport } from "./rawEventsExport";

export function buildEventsExportFilesForAccDecDirection(analysisResults, accDecDirection) {
  const entireStatsExport = buildEntireEventsStatsExportForAccDecDirection(
    analysisResults,
    accDecDirection,
  );
  const earlyLateStatsExport = buildEarlyLateEventsStatsExportForAccDecDirection(
    analysisResults,
    accDecDirection,
  );
  const rawEventsExport = buildRawEventsExport(analysisResults, accDecDirection);
  return [
    buildCsvFile(
      `${accDecDirection}_event_entire_stats.csv`,
      entireStatsExport.headers,
      entireStatsExport.rows,
    ),
    buildCsvFile(
      `${accDecDirection}_event_early_late_stats.csv`,
      earlyLateStatsExport.headers,
      earlyLateStatsExport.rows,
    ),
    buildCsvFile(`${accDecDirection}_events.csv`, rawEventsExport.headers, rawEventsExport.rows),
  ];
}

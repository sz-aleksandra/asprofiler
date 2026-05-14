import { downloadZip, toCsvFile } from "../shared/csvExportUtils";
import { buildEarlyLateRows, buildOverallRows, buildRawEventRows } from "./eventExportRows";

function eventExportFileNames(direction) {
  return {
    overall:
      direction === "acceleration"
        ? "acceleration_event_summary.csv"
        : "deceleration_event_summary.csv",
    earlyLate:
      direction === "acceleration"
        ? "acceleration_event_early_late_summary.csv"
        : "deceleration_event_early_late_summary.csv",
    raw: direction === "acceleration" ? "acceleration_events.csv" : "deceleration_events.csv",
    zip:
      direction === "acceleration"
        ? "acceleration_event_summary.zip"
        : "deceleration_event_summary.zip",
  };
}

function toEventCsvFile(name, data) {
  return toCsvFile(name, data.headers, data.csvRows);
}

export async function exportDirectionalEventTablesZip({ results, direction }) {
  await downloadZip(buildDirectionalEventExportFiles(results, direction), eventExportFileNames(direction).zip);
}

export function buildDirectionalEventExportFiles(results, direction) {
  const names = eventExportFileNames(direction);
  return [
    toEventCsvFile(names.overall, buildOverallRows(results, direction)),
    toEventCsvFile(names.earlyLate, buildEarlyLateRows(results, direction)),
    toEventCsvFile(names.raw, buildRawEventRows(results, direction)),
  ];
}

import { downloadZip, toCsvFile } from "../shared/csvExportUtils";
import { ASP_POINT_HEADERS, buildPointRowsForDirection } from "./aspExportRows";
import { ASP_SUMMARY_HEADERS, buildSummaryCsvRows } from "./aspExportSummaryRows";

export async function exportAspCsv({ results }) {
  if (!Array.isArray(results) || results.length === 0) return;
  await downloadZip(buildAspExportFiles(results), "asp_dsp_points_summary.zip");
}

export function buildAspExportFiles(results) {
  const accelerationRows = buildPointRowsForDirection(results, "acceleration");
  const decelerationRows = buildPointRowsForDirection(results, "deceleration");
  const files = [];

  if (accelerationRows.length > 0) {
    files.push(toCsvFile("asp_point.csv", ASP_POINT_HEADERS, accelerationRows));
  }

  if (decelerationRows.length > 0) {
    files.push(toCsvFile("dsp_points.csv", ASP_POINT_HEADERS, decelerationRows));
  }

  if ((results || []).length > 0) {
    files.push(toCsvFile("asp_dsp_summary.csv", ASP_SUMMARY_HEADERS, buildSummaryCsvRows(results)));
  }

  return files;
}

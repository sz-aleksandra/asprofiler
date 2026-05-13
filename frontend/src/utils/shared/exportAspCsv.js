import JSZip from "jszip";

import { createCsvText } from "./downloadCsv";

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

function withBom(csvText) {
  return `\uFEFF${csvText}\n`;
}

function formatValue(value) {
  return value === undefined || value === null || Number.isNaN(value) ? "-" : Number(value).toFixed(2);
}

function formatSpeedMps(value) {
  return value === undefined || value === null || Number.isNaN(value) ? "-" : Number(value).toFixed(2);
}

function formatSpeedKmh(value) {
  return value === undefined || value === null || Number.isNaN(value)
    ? "-"
    : (Number(value) * 3.6).toFixed(2);
}

function buildPointRowsForDirection(results, direction) {
  const profileKey = `${direction}_profile`;
  const classificationKey = `${direction}_classification`;

  return (results || []).flatMap((item) => {
    const profile = item?.profile?.[profileKey];
    if (!profile) return [];

    const bodyMassKg = Number(profile?.meta?.body_mass_kg || 1);
    return (item?.profile?.points || []).map((point) => [
      item.name,
      direction,
      point.index,
      point[classificationKey] || "",
      point.time,
      point.absolute_time || "",
      Number(point.speed).toFixed(3),
      Number(point.acceleration).toFixed(3),
      (Number(point.acceleration) * bodyMassKg).toFixed(3),
      bodyMassKg.toFixed(3),
    ]);
  });
}

function buildSummaryCsvRows(results) {
  return (results || []).flatMap((item) => {
    const directions = [
      { key: "acceleration", label: "Acceleration", plotMultiplier: 1 },
      { key: "deceleration", label: "Deceleration", plotMultiplier: -1 },
    ];

    return directions.map(({ key, label, plotMultiplier }) => {
      const profile = item?.profile?.[`${key}_profile`];
      const fit = profile?.fit;
      const bodyMassKg = Number(profile?.meta?.body_mass_kg || 1);
      const a0 = fit?.intercept != null ? Number(fit.intercept) * plotMultiplier : null;
      const slope = fit?.slope != null ? Number(fit.slope) * plotMultiplier : null;
      const f0 = a0 != null && Number.isFinite(bodyMassKg) ? a0 * bodyMassKg : null;
    const equation =
      a0 != null && slope != null
        ? `a = ${formatValue(a0)} + (${formatValue(slope)}) x v`
        : "-";

      return [
        item.name,
        label,
        equation,
        formatValue(a0),
        formatValue(f0),
        formatSpeedMps(fit?.zero_crossing_speed),
        formatSpeedKmh(fit?.zero_crossing_speed),
        formatValue(bodyMassKg),
      ];
    });
  });
}

export async function exportAspCsv({ results }) {
  if (!Array.isArray(results) || results.length === 0) return;

  const files = buildAspExportFiles(results);
  const zip = new JSZip();
  files.forEach((file) => {
    zip.file(file.name, file.content);
  });

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, "asp_dsp_points_summary.zip");
}

export function buildAspExportFiles(results) {
  const headers = [
    "file_name",
    "profile",
    "index",
    "classification",
    "time",
    "absolute_time",
    "speed_m_per_s",
    "acceleration_m_per_s2",
    "force_n",
    "body_mass_kg",
  ];
  const accelerationRows = buildPointRowsForDirection(results, "acceleration");
  const decelerationRows = buildPointRowsForDirection(results, "deceleration");
  const files = [];

  if (accelerationRows.length > 0) {
    const aspCsvText = createCsvText(headers, accelerationRows);
    files.push({ name: "asp_point.csv", content: withBom(aspCsvText) });
  }

  if (decelerationRows.length > 0) {
    const dspCsvText = createCsvText(headers, decelerationRows);
    files.push({ name: "dsp_points.csv", content: withBom(dspCsvText) });
  }

  if (results.length > 0) {
    const summaryHeaders = [
      "file_name",
      "profile",
      "asp_equation",
      "a0_m_per_s2",
      "f0_n",
      "s0_m_per_s",
      "s0_km_per_h",
      "body_mass_kg",
    ];
    const summaryCsvText = createCsvText(summaryHeaders, buildSummaryCsvRows(results));
    files.push({ name: "asp_dsp_summary.csv", content: withBom(summaryCsvText) });
  }

  return files;
}

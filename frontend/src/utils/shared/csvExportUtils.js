import JSZip from "jszip";

function escapeCsvCell(value) {
  if (value === null || value === undefined) return "";
  const normalized = String(value);
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }
  return normalized;
}

export function createCsvText(headers, rows) {
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function withBom(csvText) {
  return `\uFEFF${csvText}\n`;
}

export function toCsvFile(name, headers, rows) {
  return {
    name,
    headers,
    rows,
    content: withBom(createCsvText(headers, rows)),
  };
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv(headers, rows, fileName) {
  const blob = new Blob([withBom(createCsvText(headers, rows))], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(blob, fileName);
}

export async function downloadZip(files, fileName) {
  const zip = new JSZip();
  files.forEach((file) => {
    zip.file(file.name, file.content);
  });
  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, fileName);
}

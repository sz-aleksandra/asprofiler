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

export function downloadCsv(headers, rows, fileName) {
  const csvText = createCsvText(headers, rows);
  const blob = new Blob([`\uFEFF${csvText}\n`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

import { downloadCsv } from "./downloadCsv";

function normalizeCsvCell(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function buildDefaultCsvRows(columns, rows) {
  return rows.map((row) =>
    columns.map((column) => {
      if (column.exportValue) return column.exportValue(row);
      if (typeof column.renderCell === "function") return normalizeCsvCell(column.renderCell(row));
      return normalizeCsvCell(row?.[column.key]);
    }),
  );
}

function buildEarlyLateCsvRows(columns, rows) {
  const phaseRows = [
    { label: "Early", index: 0 },
    { label: "Late", index: 1 },
    { label: "Early/Late Ratio", index: 2 },
  ];

  return rows.flatMap((row) =>
    phaseRows.map((phase) => [
      phase.label,
      ...columns.map((column) => {
        if (column.exportTripletValue) {
          const values = column.exportTripletValue(row);
          return Array.isArray(values) ? values[phase.index] : "";
        }
        if (column.exportValue) return column.exportValue(row);
        if (typeof column.renderCell === "function") return normalizeCsvCell(column.renderCell(row));
        return normalizeCsvCell(row?.[column.key]);
      }),
    ]),
  );
}

export function exportAnalysisTableCsv({ columns, rows, fileName, csvMode = "default" }) {
  const headers = [
    ...(csvMode === "earlyLateSplit" ? ["Phase"] : []),
    ...columns.map((column) => column.exportHeader || column.header || column.key),
  ];
  const csvRows =
    csvMode === "earlyLateSplit"
      ? buildEarlyLateCsvRows(columns, rows)
      : buildDefaultCsvRows(columns, rows);

  downloadCsv(headers, csvRows, fileName || "analysis-table.csv");
}

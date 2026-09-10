import JSZip from "jszip";

function serializeCsvCell(cellValue) {
  if (cellValue == null) return "";
  const cellText = String(cellValue);
  if (/[",\n]/.test(cellText)) {
    return `"${cellText.replaceAll('"', '""')}"`;
  }
  return cellText;
}

export function buildCsvFile(fileName, csvHeader, csvRows) {
  return {
    name: fileName,
    content: `\uFEFF${[csvHeader, ...csvRows]
      .map((csvRow) => csvRow.map(serializeCsvCell).join(","))
      .join("\n")}\n`,
  };
}

export function downloadBlob(blobContent, outputFileName) {
  const blobUrl = URL.createObjectURL(blobContent);
  const downloadLink = document.createElement("a");
  downloadLink.href = blobUrl;
  downloadLink.download = outputFileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(blobUrl);
}

export async function downloadZip(archiveEntries, outputFileName) {
  const zipArchive = new JSZip();
  archiveEntries.forEach((archiveEntry) =>
    zipArchive.file(archiveEntry.name, archiveEntry.content),
  );
  downloadBlob(await zipArchive.generateAsync({ type: "blob" }), outputFileName);
}

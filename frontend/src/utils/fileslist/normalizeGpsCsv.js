const REQUIRED_COLUMNS = ["Time", "Speed (m/s)", "Lat", "Lon", "Hacc", "Hdop", "No. of Satellites"];

function mean(gpsCsvValues) {
  return (
    gpsCsvValues.reduce((gpsCsvValuesSum, gpsCsvValue) => gpsCsvValuesSum + gpsCsvValue, 0) /
    gpsCsvValues.length
  );
}

function filterByQuality(csvRows, csvQualityFilters) {
  return csvRows.filter(
    (csvRow) =>
      csvRow.horizontalAccuracyM <= csvQualityFilters.maxHorizontalAccuracyM &&
      csvRow.horizontalDilutionOfPrecision <= csvQualityFilters.maxHorizontalDilutionOfPrecision &&
      csvRow.satelliteCount >= csvQualityFilters.minSatelliteCount,
  );
}

function parseGpsCsv(csvText) {
  const csvLines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);

  if (csvLines.length < 2) throw new Error("Invalid CSV: no data rows");

  const csvHeaders = csvLines[0].split(",").map((csvHeader) => csvHeader.trim());
  const columnIndex = Object.fromEntries(
    REQUIRED_COLUMNS.map((columnName) => [columnName, csvHeaders.indexOf(columnName)]),
  );

  const missingColumns = REQUIRED_COLUMNS.filter((columnName) => columnIndex[columnName] === -1);
  if (missingColumns.length) {
    throw new Error(`Invalid CSV: missing columns: ${missingColumns.join(", ")}`);
  }

  return csvLines.slice(1).map((csvLine) => {
    const cells = csvLine.split(",");
    return {
      time: cells[columnIndex["Time"]].trim(),
      speed: Number(cells[columnIndex["Speed (m/s)"]]),
      lat: Number(cells[columnIndex["Lat"]]),
      lon: Number(cells[columnIndex["Lon"]]),
      horizontalAccuracyM: Number(cells[columnIndex["Hacc"]]),
      horizontalDilutionOfPrecision: Number(cells[columnIndex["Hdop"]]),
      satelliteCount: Number(cells[columnIndex["No. of Satellites"]]),
    };
  });
}

function serializeCsv(csvRows) {
  return [
    "time,speed,lat,lon",
    ...csvRows.map((csvRow) => `${csvRow.time},${csvRow.speed},${csvRow.lat},${csvRow.lon}`),
  ].join("\n");
}

function collapseDuplicateTimestamps(csvRows) {
  const rowsByTimestamp = new Map();
  for (const csvRow of csvRows) {
    if (!rowsByTimestamp.has(csvRow.time)) rowsByTimestamp.set(csvRow.time, []);
    rowsByTimestamp.get(csvRow.time).push(csvRow);
  }
  return [...rowsByTimestamp.entries()].map(([time, rowsForTimestamp]) => ({
    time,
    speed: mean(rowsForTimestamp.map((csvRow) => csvRow.speed)),
    lat: mean(rowsForTimestamp.map((csvRow) => csvRow.lat)),
    lon: mean(rowsForTimestamp.map((csvRow) => csvRow.lon)),
  }));
}

export async function normalizeGpsCsvFile(gpsCsvFile, csvQualityFilters) {
  const filteredRows = filterByQuality(parseGpsCsv(await gpsCsvFile.text()), csvQualityFilters);
  if (!filteredRows.length) throw new Error("No rows passed quality filters");
  return new File(
    [`${serializeCsv(collapseDuplicateTimestamps(filteredRows))}\n`],
    gpsCsvFile.name,
    {
      type: "text/csv",
      lastModified: gpsCsvFile.lastModified,
    },
  );
}

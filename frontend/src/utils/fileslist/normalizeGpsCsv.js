const REQUIRED_COLUMNS = ["Time", "Speed (m/s)", "Lat", "Lon", "Hacc", "Hdop", "No. of Satellites"];

const DEFAULT_FILTERS = {
  maximumHorizontalAccuracyMeters: 2,
  maximumHorizontalDilutionOfPrecision: 1,
  minimumSatellites: 6,
};

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function normalizeGpsCsvFile(file, options = {}) {
  const filters = { ...DEFAULT_FILTERS, ...options };

  const lines = (await file.text())
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);

  if (lines.length < 2) throw new Error("Invalid CSV: file is empty");

  const headers = lines[0].split(",").map((header) => header.trim());
  const columnIndex = Object.fromEntries(
    REQUIRED_COLUMNS.map((name) => [name, headers.indexOf(name)]),
  );

  const missing = REQUIRED_COLUMNS.filter((name) => columnIndex[name] === -1);
  if (missing.length) {
    throw new Error(`Invalid CSV: missing columns: ${missing.join(", ")}`);
  }

  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",");
    return {
      time: cells[columnIndex["Time"]].trim(),
      speed: Number(cells[columnIndex["Speed (m/s)"]]),
      latitude: Number(cells[columnIndex["Lat"]]),
      longitude: Number(cells[columnIndex["Lon"]]),
      horizontalAccuracyMeters: Number(cells[columnIndex["Hacc"]]),
      horizontalDilutionOfPrecision: Number(cells[columnIndex["Hdop"]]),
      satellites: Number(cells[columnIndex["No. of Satellites"]]),
    };
  });

  const filtered = rows.filter(
    (row) =>
      row.horizontalAccuracyMeters <= filters.maximumHorizontalAccuracyMeters &&
      row.horizontalDilutionOfPrecision <= filters.maximumHorizontalDilutionOfPrecision &&
      row.satellites >= filters.minimumSatellites,
  );

  if (!filtered.length) throw new Error("No rows passed quality filters");

  const groups = new Map();
  for (const row of filtered) {
    if (!groups.has(row.time)) groups.set(row.time, []);
    groups.get(row.time).push(row);
  }

  const collapsed = [...groups.entries()].map(([time, group]) => ({
    time,
    speed: mean(group.map((row) => row.speed)),
    latitude: mean(group.map((row) => row.latitude)),
    longitude: mean(group.map((row) => row.longitude)),
  }));

  const output = [
    "time,speed,latitude,longitude",
    ...collapsed.map((row) => `${row.time},${row.speed},${row.latitude},${row.longitude}`),
  ].join("\n");

  return new File([`${output}\n`], file.name, {
    type: "text/csv",
    lastModified: file.lastModified,
  });
}

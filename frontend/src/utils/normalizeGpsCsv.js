const RAW_TIME_COL = "Time";
const RAW_SPEED_COL = "Speed (m/s)";
const RAW_LAT_COL = "Lat";
const RAW_LON_COL = "Lon";
const RAW_HACC_COL = "Hacc";
const NORMALIZED_TIME_COL = "time";
const NORMALIZED_ABSOLUTE_TIME_COL = "absolute_time";
const NORMALIZED_SPEED_COL = "speed";
const NORMALIZED_ACCEL_COL = "acceleration";
const NORMALIZED_LAT_COL = "lat";
const NORMALIZED_LON_COL = "lon";
const DEFAULT_FILTER_WINDOW = 5;
const DEFAULT_HACC_THRESHOLD = 2;
const DEFAULT_FILTER_MODE = "median_mean";

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseCsv(text) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.length > 0)
    .map(parseCsvLine);
}

function parseTimeToSeconds(value) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("empty time");
  const parts = trimmed.split(":");
  if (parts.length !== 3) throw new Error(`bad time format: ${value}`);
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const seconds = Number(parts[2]);
  return hours * 3600 + minutes * 60 + seconds;
}

function getFieldIndex(headers, candidates) {
  const fieldMap = new Map(headers.map((header, index) => [header.trim().toLowerCase(), index]));
  for (const name of candidates) {
    const index = fieldMap.get(name.toLowerCase());
    if (index !== undefined) return index;
  }
  return -1;
}

function toCsvLine(values) {
  return values
    .map((value) => {
      const text = String(value ?? "");
      if (text.includes('"')) return `"${text.replace(/"/g, '""')}"`;
      if (text.includes(",") || text.includes("\n")) return `"${text}"`;
      return text;
    })
    .join(",");
}

function parseNumericCell(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function rollingWindow(values, windowSize, reducer) {
  const radius = Math.floor(windowSize / 2);
  return values.map((_, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(values.length, index + radius + 1);
    return reducer(values.slice(start, end));
  });
}

function mean(values) {
  if (!values.length) return NaN;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function computeDvDt(times, velocities) {
  return velocities.map((velocity, index) => {
    if (index === 0) return 0;
    const dt = times[index] - times[index - 1];
    if (!Number.isFinite(dt) || dt <= 0) return 0;
    return (velocity - velocities[index - 1]) / dt;
  });
}

function averageNullable(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) return null;
  return mean(finite);
}

export async function normalizeGpsCsvFile(file, options = {}) {
  const filterWindow = Math.max(1, Math.floor(Number(options.filterWindow) || DEFAULT_FILTER_WINDOW));
  const haccThreshold = Number(options.haccThreshold);
  const maxHacc = Number.isFinite(haccThreshold) ? haccThreshold : DEFAULT_HACC_THRESHOLD;
  const filterMode = String(options.filterMode || DEFAULT_FILTER_MODE);
  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length) {
    throw new Error("Missing CSV header");
  }

  const headers = rows[0];
  const timeIndex = getFieldIndex(headers, [RAW_TIME_COL]);
  const speedIndex = getFieldIndex(headers, [RAW_SPEED_COL]);
  const latIndex = getFieldIndex(headers, [RAW_LAT_COL]);
  const lonIndex = getFieldIndex(headers, [RAW_LON_COL]);
  const haccIndex = getFieldIndex(headers, [RAW_HACC_COL]);
  if (timeIndex < 0 || speedIndex < 0) {
    throw new Error("CSV must contain time and speed columns");
  }

  const normalizedRows = [];
  let firstTimeSec = null;

  for (const row of rows.slice(1)) {
    try {
      const tRaw = String(row[timeIndex] ?? "").trim();
      const s = parseNumericCell(row[speedIndex]);
      const lat = latIndex >= 0 ? parseNumericCell(row[latIndex]) : NaN;
      const lon = lonIndex >= 0 ? parseNumericCell(row[lonIndex]) : NaN;
      const hacc = haccIndex >= 0 ? parseNumericCell(row[haccIndex]) : NaN;
      if (!Number.isFinite(s)) {
        continue;
      }
      if (Number.isFinite(hacc) && hacc > maxHacc) {
        continue;
      }

      let tSec = parseTimeToSeconds(tRaw);
      if (firstTimeSec === null) firstTimeSec = tSec;
      tSec -= firstTimeSec;

      normalizedRows.push({
        time: tSec,
        absoluteTime: tRaw,
        rawSpeed: s,
        latitude: Number.isFinite(lat) ? lat : null,
        longitude: Number.isFinite(lon) ? lon : null,
      });
    } catch {
      // ignore
    }
  }

  if (!normalizedRows.length) {
    throw new Error("No valid rows found after preprocessing");
  }

  const groupedRows = Array.from(
    normalizedRows
      .reduce((groups, row) => {
        const key = row.time.toFixed(6);
        const list = groups.get(key) || [];
        list.push(row);
        groups.set(key, list);
        return groups;
      }, new Map())
      .entries(),
  )
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([, rowsAtTime]) => {
      const firstRow = rowsAtTime[0];
      const time = mean(rowsAtTime.map((row) => row.time));
      return {
        time,
        formattedTime: time.toFixed(3),
        absoluteTime: firstRow.absoluteTime,
        rawSpeed: mean(rowsAtTime.map((row) => row.rawSpeed)),
        latitude: averageNullable(rowsAtTime.map((row) => row.latitude)),
        longitude: averageNullable(rowsAtTime.map((row) => row.longitude)),
      };
    });

  const rawSpeeds = groupedRows.map((row) => row.rawSpeed);
  let filteredSpeeds = rawSpeeds;

  if (filterWindow > 1) {
    if (filterMode === "median") {
      filteredSpeeds = rollingWindow(rawSpeeds, filterWindow, median);
    } else if (filterMode === "mean") {
      filteredSpeeds = rollingWindow(rawSpeeds, filterWindow, mean);
    } else if (filterMode === "median_mean") {
      const speedMedian = rollingWindow(rawSpeeds, filterWindow, median);
      filteredSpeeds = rollingWindow(speedMedian, filterWindow, mean);
    }
  }

  const dvDt = computeDvDt(
    groupedRows.map((row) => row.time),
    filteredSpeeds,
  );

  const outputLines = [
    toCsvLine([
      NORMALIZED_TIME_COL,
      NORMALIZED_ABSOLUTE_TIME_COL,
      NORMALIZED_SPEED_COL,
      NORMALIZED_ACCEL_COL,
      NORMALIZED_LAT_COL,
      NORMALIZED_LON_COL,
    ]),
  ];

  groupedRows.forEach((row, index) => {
    const filteredSpeed = filteredSpeeds[index];
    const derivedAcceleration = dvDt[index];
    outputLines.push(
      toCsvLine([
        row.formattedTime,
        row.absoluteTime,
        filteredSpeed.toFixed(6),
        derivedAcceleration.toFixed(6),
        row.latitude ?? "",
        row.longitude ?? "",
      ]),
    );
  });

  return new File([`${outputLines.join("\n")}\n`], file.name, {
    type: "text/csv",
    lastModified: file.lastModified,
  });
}

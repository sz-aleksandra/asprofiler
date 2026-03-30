const RAW_TIME_COL = "Time";
const RAW_SPEED_COL = "Speed (m/s)";
const RAW_ACCEL_COL = "Instantaneous Acceleration Impulse";
const NORMALIZED_TIME_COL = "time";
const NORMALIZED_ABSOLUTE_TIME_COL = "absolute_time";
const NORMALIZED_SPEED_COL = "speed";
const NORMALIZED_ACCEL_COL = "acceleration";

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

export async function normalizeGpsCsvFile(file) {
  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length) {
    throw new Error("Missing CSV header");
  }

  const headers = rows[0];
  const timeIndex = getFieldIndex(headers, [RAW_TIME_COL, NORMALIZED_TIME_COL]);
  const absoluteTimeIndex = getFieldIndex(headers, [NORMALIZED_ABSOLUTE_TIME_COL]);
  const speedIndex = getFieldIndex(headers, [RAW_SPEED_COL, NORMALIZED_SPEED_COL]);
  const accelIndex = getFieldIndex(headers, [RAW_ACCEL_COL, NORMALIZED_ACCEL_COL]);
  if (timeIndex < 0 || speedIndex < 0 || accelIndex < 0) {
    throw new Error("CSV must contain time, speed and acceleration columns");
  }

  const rawSpeedHeader = headers[speedIndex]?.trim().toLowerCase() === RAW_SPEED_COL.toLowerCase();
  const rawAccelHeader = headers[accelIndex]?.trim().toLowerCase() === RAW_ACCEL_COL.toLowerCase();
  const rawTimeHeader = headers[timeIndex]?.trim().toLowerCase() === RAW_TIME_COL.toLowerCase();
  const treatAsRaw = rawTimeHeader && (rawSpeedHeader || rawAccelHeader);

  const outputLines = [
    toCsvLine([
      NORMALIZED_TIME_COL,
      NORMALIZED_ABSOLUTE_TIME_COL,
      NORMALIZED_SPEED_COL,
      NORMALIZED_ACCEL_COL,
    ]),
  ];
  const seenRows = new Set();
  let firstTimeSec = null;
  let keptRows = 0;

  for (const row of rows.slice(1)) {
    try {
      const tRaw = String(row[timeIndex] ?? "").trim();
      const absoluteTimeRaw = String(row[absoluteTimeIndex] ?? "").trim();
      const s = Number(String(row[speedIndex] ?? "").trim());
      const a = Number(String(row[accelIndex] ?? "").trim());
      if (!Number.isFinite(s) || !Number.isFinite(a)) {
        continue;
      }

      let tSec;
      if (treatAsRaw) {
        tSec = parseTimeToSeconds(tRaw);
        if (firstTimeSec === null) firstTimeSec = tSec;
        tSec -= firstTimeSec;
      } else {
        tSec = Number(tRaw);
        if (!Number.isFinite(tSec)) continue;
      }

      const formattedTime = tSec.toFixed(3);
      const key = `${formattedTime}|${s}|${a}`;
      if (seenRows.has(key)) {
        continue;
      }
      seenRows.add(key);

      const absoluteTime = treatAsRaw ? tRaw : absoluteTimeRaw;
      outputLines.push(
        toCsvLine([formattedTime, absoluteTime, s.toFixed(6), a.toFixed(6)]),
      );
      keptRows += 1;
    } catch {
      // skip invalid rows to match script behavior
    }
  }

  if (!keptRows) {
    throw new Error("No valid rows found after preprocessing");
  }

  return new File([`${outputLines.join("\n")}\n`], file.name, {
    type: "text/csv",
    lastModified: file.lastModified,
  });
}

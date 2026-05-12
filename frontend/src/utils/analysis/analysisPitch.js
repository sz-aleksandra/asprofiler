import { PITCH_LENGTH_METERS } from "../shared/analysisConstants";

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

export function projectPitchPoints(latitudes, longitudes, speeds, speedThreshold) {
  if (!Array.isArray(latitudes) || !Array.isArray(longitudes)) return null;

  const points = [];
  for (let index = 0; index < Math.min(latitudes.length, longitudes.length); index += 1) {
    const latitude = latitudes[index];
    const longitude = longitudes[index];
    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) continue;
    points.push({
      index,
      speed: Number.isFinite(Number(speeds?.[index])) ? Number(speeds[index]) : 0,
      latitude: Number(latitude),
      longitude: Number(longitude),
    });
  }

  if (points.length < 2) return null;

  let fastPoints = points.filter((point) => point.speed > speedThreshold);
  if (fastPoints.length < 10) fastPoints = points;

  const lat0 =
    fastPoints.reduce((sum, point) => sum + toRadians(point.latitude), 0) / fastPoints.length;
  const lon0 =
    fastPoints.reduce((sum, point) => sum + toRadians(point.longitude), 0) / fastPoints.length;

  const projected = points.map((point) => {
    const latRad = toRadians(point.latitude);
    const lonRad = toRadians(point.longitude);
    return {
      index: point.index,
      x: (lonRad - lon0) * Math.cos(lat0) * 6371000,
      speed: point.speed,
    };
  });

  let fastProjected = projected.filter((point) => point.speed > speedThreshold);
  if (fastProjected.length < 10) fastProjected = projected;

  const xmin = Math.min(...fastProjected.map((point) => point.x));
  const xmax = Math.max(...fastProjected.map((point) => point.x));
  let xShift = 0;
  if (xmin < -(PITCH_LENGTH_METERS / 2)) xShift += -(PITCH_LENGTH_METERS / 2) - xmin;
  if (xmax + xShift > PITCH_LENGTH_METERS / 2) xShift += PITCH_LENGTH_METERS / 2 - (xmax + xShift);

  return projected.map((point) => ({
    index: point.index,
    x: point.x + xShift + PITCH_LENGTH_METERS / 2,
  }));
}

export function zoneFromX(xValue) {
  if (!Number.isFinite(Number(xValue))) return null;
  const third = PITCH_LENGTH_METERS / 3;
  if (xValue < third) return "left";
  if (xValue < third * 2) return "middle";
  return "right";
}

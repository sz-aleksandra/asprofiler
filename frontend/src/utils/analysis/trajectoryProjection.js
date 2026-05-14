import { accelerationToForce } from "../shared/unitConversions";
import { PITCH_LENGTH, PITCH_WIDTH } from "./trajectoryPitch";

const EARTH_RADIUS_METERS = 6371000;

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function chooseReferencePoints(points, speedThreshold) {
  const fastPoints = points.filter((point) => point.speed > speedThreshold);
  return fastPoints.length >= 10 ? fastPoints : points;
}

export function prepareTrajectory(item, speedThreshold) {
  const timeseries = item?.profile?.timeseries;
  const bodyMassKg = Number(item?.profile?.acceleration_profile?.meta?.body_mass_kg) || 1;
  const speed = Array.isArray(timeseries?.speed) ? timeseries.speed : [];
  const latitudeValues = Array.isArray(timeseries?.latitude) ? timeseries.latitude : [];
  const longitudeValues = Array.isArray(timeseries?.longitude) ? timeseries.longitude : [];
  const time = Array.isArray(timeseries?.relative_time) ? timeseries.relative_time : [];
  const absoluteTime = Array.isArray(timeseries?.time) ? timeseries.time : [];
  const acceleration = Array.isArray(timeseries?.acceleration) ? timeseries.acceleration : [];

  const points = speed
    .map((speedValue, index) => ({
      index,
      time: Number(time[index]),
      absoluteTime: absoluteTime[index] || "",
      speed: Number(speedValue),
      acceleration: Number(acceleration[index]),
      force: accelerationToForce(acceleration[index], bodyMassKg),
      latitude: Number(latitudeValues[index]),
      longitude: Number(longitudeValues[index]),
    }))
    .filter(
      (point) =>
        Number.isInteger(point.index) &&
        Number.isFinite(point.time) &&
        Number.isFinite(point.speed) &&
        Number.isFinite(point.acceleration) &&
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude),
    );

  if (points.length < 2) return null;

  const referencePoints = chooseReferencePoints(points, speedThreshold);
  const latitudeCenter =
    referencePoints.reduce((sum, point) => sum + toRadians(point.latitude), 0) /
    referencePoints.length;
  const longitudeCenter =
    referencePoints.reduce((sum, point) => sum + toRadians(point.longitude), 0) /
    referencePoints.length;

  const projected = points.map((point) => {
    const latitudeRadians = toRadians(point.latitude);
    const longitudeRadians = toRadians(point.longitude);
    return {
      ...point,
      x: (longitudeRadians - longitudeCenter) * Math.cos(latitudeCenter) * EARTH_RADIUS_METERS,
      y: (latitudeRadians - latitudeCenter) * EARTH_RADIUS_METERS,
    };
  });

  const referenceProjected = chooseReferencePoints(projected, speedThreshold);
  const minimumX = Math.min(...referenceProjected.map((point) => point.x));
  const maximumX = Math.max(...referenceProjected.map((point) => point.x));
  const minimumY = Math.min(...referenceProjected.map((point) => point.y));
  const maximumY = Math.max(...referenceProjected.map((point) => point.y));

  let xShift = 0;
  let yShift = 0;

  if (minimumX < -PITCH_LENGTH / 2) xShift += -PITCH_LENGTH / 2 - minimumX;
  if (maximumX + xShift > PITCH_LENGTH / 2) {
    xShift += PITCH_LENGTH / 2 - (maximumX + xShift);
  }
  if (minimumY < -PITCH_WIDTH / 2) yShift += -PITCH_WIDTH / 2 - minimumY;
  if (maximumY + yShift > PITCH_WIDTH / 2) {
    yShift += PITCH_WIDTH / 2 - (maximumY + yShift);
  }

  return projected.map((point) => ({
    ...point,
    name: item.name,
    x: point.x + xShift,
    y: point.y + yShift,
  }));
}

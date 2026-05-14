export const ASP_POINT_HEADERS = [
  "file_name",
  "profile",
  "index",
  "classification",
  "time",
  "absolute_time",
  "speed_m_per_s",
  "acceleration_m_per_s2",
  "force_n",
  "body_mass_kg",
];

export function buildPointRowsForDirection(results, direction) {
  const profileKey = `${direction}_profile`;
  const classificationKey = `${direction}_classification`;

  return (results || []).flatMap((item) => {
    const profile = item?.profile?.[profileKey];
    if (!profile) return [];

    const bodyMassKg = Number(profile?.meta?.body_mass_kg || 1);
    return (item?.profile?.points || []).map((point) => [
      item.name,
      direction,
      point.index,
      point[classificationKey] || "",
      point.time,
      point.absolute_time || "",
      Number(point.speed).toFixed(3),
      Number(point.acceleration).toFixed(3),
      accelerationToForce(point.acceleration, bodyMassKg).toFixed(3),
      bodyMassKg.toFixed(3),
    ]);
  });
}
import { accelerationToForce } from "../shared/unitConversions";

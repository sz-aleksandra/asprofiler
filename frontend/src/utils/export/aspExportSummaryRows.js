import { formatNumber, formatSpeedKmh } from "../shared/csvFormatters";
import { accelerationToForce } from "../shared/unitConversions";

export const ASP_SUMMARY_HEADERS = [
  "file_name",
  "profile",
  "asp_equation",
  "a0_m_per_s2",
  "f0_n",
  "s0_m_per_s",
  "s0_km_per_h",
  "body_mass_kg",
];

function formatValue(value) {
  return formatNumber(value);
}

export function buildSummaryCsvRows(results) {
  return (results || []).flatMap((item) => {
    const directions = [
      { key: "acceleration", label: "Acceleration", plotMultiplier: 1 },
      { key: "deceleration", label: "Deceleration", plotMultiplier: -1 },
    ];

    return directions.map(({ key, label, plotMultiplier }) => {
      const profile = item?.profile?.[`${key}_profile`];
      const fit = profile?.fit;
      const bodyMassKg = Number(profile?.meta?.body_mass_kg || 1);
      const a0 = fit?.intercept != null ? Number(fit.intercept) * plotMultiplier : null;
      const slope = fit?.slope != null ? Number(fit.slope) * plotMultiplier : null;
      const f0 = a0 != null && Number.isFinite(bodyMassKg) ? accelerationToForce(a0, bodyMassKg) : null;
      const equation =
        a0 != null && slope != null
          ? `a = ${formatValue(a0)} + (${formatValue(slope)}) x speed`
          : "";

      return [
        item.name,
        label,
        equation,
        formatValue(a0),
        formatValue(f0),
        formatValue(fit?.zero_crossing_speed),
        formatSpeedKmh(fit?.zero_crossing_speed),
        formatValue(bodyMassKg),
      ];
    });
  });
}

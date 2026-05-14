import { accelerationToForce, scaleByMass } from "../shared/unitConversions";

export function buildEventColumns({
  styles,
  horizontalPowerLabel,
  impulseLabel,
  ratioLabel,
  direction,
  formatEventBinLabel: formatLabel,
  formatCount,
  formatNumber,
  formatWithUnit,
  formatSecondsValue,
  renderSpeedWithKmh,
  renderInfoHeader,
  isForceProfile,
  getEventBodyMassKg,
}) {
  return [
    {
      key: "fileName",
      header: "Filename",
      exportHeader: "Filename",
      cellClassName: styles.statsLabel,
      renderCell: (row) => row.fileName,
      exportValue: (row) => row.fileName,
    },
    {
      key: "bin",
      header: `Bin (${isForceProfile ? "N" : "m/s²"})`,
      exportHeader: `Bin (${isForceProfile ? "N" : "m/s²"})`,
      cellClassName: styles.statsValue,
      renderCell: (row) => formatLabel(row.bin),
      exportValue: (row) => formatLabel(row.bin),
    },
    {
      key: "count",
      header: "Count",
      exportHeader: "Count",
      cellClassName: styles.statsValue,
      renderCell: (row) => formatCount(row.values?.count),
      exportValue: (row) => formatCount(row.values?.count),
    },
    {
      key: "density",
      header: "Density",
      exportHeader: "Density",
      cellClassName: styles.statsValue,
      renderCell: (row) => `${formatNumber(row.values?.density_per_minute)}/min`,
      exportValue: (row) => `${formatNumber(row.values?.density_per_minute)}/min`,
    },
    {
      key: "ratio",
      exportHeader: ratioLabel,
      cellClassName: styles.statsValue,
      renderHeader: () =>
        renderInfoHeader(
          ratioLabel,
          direction === "deceleration"
            ? ["deceleration count / acceleration count."]
            : ["acceleration count / deceleration count."],
        ),
      renderCell: (row) => formatNumber(row.values?.ratio_to_opposite),
      exportValue: (row) => formatNumber(row.values?.ratio_to_opposite),
    },
    {
      key: "duration",
      header: "Mean duration",
      exportHeader: "Mean duration",
      cellClassName: styles.statsValue,
      renderCell: (row) => formatSecondsValue(row.values?.mean_duration),
      exportValue: (row) => formatSecondsValue(row.values?.mean_duration),
    },
    {
      key: "distance",
      header: "Mean distance",
      exportHeader: "Mean distance",
      cellClassName: styles.statsValue,
      renderCell: (row) => formatWithUnit(row.values?.mean_distance, "m"),
      exportValue: (row) => formatWithUnit(row.values?.mean_distance, "m"),
    },
    {
      key: "entrySpeed",
      header: "Mean entry speed",
      exportHeader: "Mean entry speed",
      cellClassName: styles.statsValue,
      renderCell: (row) => renderSpeedWithKmh(row.values?.mean_entry_speed),
      exportValue: (row) => renderSpeedWithKmh(row.values?.mean_entry_speed),
    },
    {
      key: "exitSpeed",
      header: "Mean exit speed",
      exportHeader: "Mean exit speed",
      cellClassName: styles.statsValue,
      renderCell: (row) => renderSpeedWithKmh(row.values?.mean_exit_speed),
      exportValue: (row) => renderSpeedWithKmh(row.values?.mean_exit_speed),
    },
    {
      key: "average",
      exportHeader: isForceProfile
        ? `Mean ${direction === "deceleration" ? "deceleration" : "acceleration"} force`
        : `Mean ${direction === "deceleration" ? "deceleration" : "acceleration"}`,
      header: isForceProfile
        ? `Mean ${direction === "deceleration" ? "deceleration" : "acceleration"} force`
        : `Mean ${direction === "deceleration" ? "deceleration" : "acceleration"}`,
      cellClassName: styles.statsValue,
      renderCell: (row) => {
        const bodyMassKg = getEventBodyMassKg(row.fileName, direction);
        const averageValue = isForceProfile
          ? accelerationToForce(row.values?.mean_average_acceleration_magnitude, bodyMassKg)
          : row.values?.mean_average_acceleration_magnitude;
        return formatWithUnit(averageValue, isForceProfile ? "N" : "m/s²");
      },
      exportValue: (row) => {
        const bodyMassKg = getEventBodyMassKg(row.fileName, direction);
        const averageValue = isForceProfile
          ? accelerationToForce(row.values?.mean_average_acceleration_magnitude, bodyMassKg)
          : row.values?.mean_average_acceleration_magnitude;
        return formatWithUnit(averageValue, isForceProfile ? "N" : "m/s²");
      },
    },
    {
      key: "powerPerKg",
      cellClassName: styles.statsValue,
      exportHeader: `Mean ${isForceProfile ? "" : "relative "}${horizontalPowerLabel}`,
      renderHeader: () =>
        renderInfoHeader(
          `Mean ${isForceProfile ? "" : "relative "}${horizontalPowerLabel}`,
          direction === "deceleration"
            ? [
                `${isForceProfile ? "Braking" : "Relative braking"} power = ${isForceProfile ? "horizontal power" : "relative horizontal power"} (absolute acceleration x speed${isForceProfile ? " x mass" : ""}).`,
              ]
            : [
                `${isForceProfile ? "Propulsive" : "Relative propulsive"} power = ${isForceProfile ? "Braking" : "Relative braking"} power equivalent for acceleration (absolute acceleration x speed${isForceProfile ? " x mass" : ""}).`,
              ],
        ),
      renderCell: (row) => {
        const bodyMassKg = getEventBodyMassKg(row.fileName, direction);
        const value = row.values?.mean_horizontal_power_per_kilogram;
        const scaled = isForceProfile && value != null ? scaleByMass(value, bodyMassKg) : value;
        return formatWithUnit(scaled, isForceProfile ? "W" : "W/kg");
      },
      exportValue: (row) => {
        const bodyMassKg = getEventBodyMassKg(row.fileName, direction);
        const value = row.values?.mean_horizontal_power_per_kilogram;
        const scaled = isForceProfile && value != null ? scaleByMass(value, bodyMassKg) : value;
        return formatWithUnit(scaled, isForceProfile ? "W" : "W/kg");
      },
    },
    {
      key: "impulse",
      cellClassName: styles.statsValue,
      exportHeader: `Mean ${impulseLabel}`,
      renderHeader: () =>
        renderInfoHeader(
          `Mean ${impulseLabel}`,
          direction === "deceleration"
            ? [
                "Horizontal Braking Impulse = change in momentum [mass x (exit speed - entry speed)].",
              ]
            : [
                "Horizontal Propulsive Impulse = Horizontal Braking Impulse equivalent for acceleration [HBI = mass x (exit speed - entry speed)].",
              ],
        ),
      renderCell: (row) => {
        const impulseValue =
          row.values?.mean_horizontal_braking_impulse === undefined ||
          row.values?.mean_horizontal_braking_impulse === null ||
          Number.isNaN(row.values?.mean_horizontal_braking_impulse)
            ? row.values?.mean_horizontal_braking_impulse
            : Math.abs(Number(row.values?.mean_horizontal_braking_impulse));
        return formatWithUnit(impulseValue, "N x s");
      },
      exportValue: (row) => {
        const impulseValue =
          row.values?.mean_horizontal_braking_impulse === undefined ||
          row.values?.mean_horizontal_braking_impulse === null ||
          Number.isNaN(row.values?.mean_horizontal_braking_impulse)
            ? row.values?.mean_horizontal_braking_impulse
            : Math.abs(Number(row.values?.mean_horizontal_braking_impulse));
        return formatWithUnit(impulseValue, "N x s");
      },
    },
  ];
}

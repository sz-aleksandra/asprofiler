import { createElement } from "react";

import {
  DEFAULT_ANALYSIS_PARAMS,
  HIGH_SPEED_RUNNING_EVENT_LABEL,
} from "../shared/analysisConstants";

const BASELINE_BODY_MASS_KG = DEFAULT_ANALYSIS_PARAMS.body_mass_kg;

function fmt(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export function formatEventBinLabel(label, eventBinMode, isForceProfile = false) {
  const m = isForceProfile ? BASELINE_BODY_MASS_KG : 1;
  const classicLabels = {
    Low: `Low (${fmt(1.5 * m)}-${fmt(2.5 * m)})`,
    High: `High (${fmt(2.5 * m)}-${fmt(3.5 * m)})`,
    VeryHigh: `Very High (>=${fmt(3.5 * m)})`,
  };
  const detailedLabels = {
    "3-4": `${fmt(3 * m)}-${fmt(4 * m)}`,
    "4-5": `${fmt(4 * m)}-${fmt(5 * m)}`,
    "5-6": `${fmt(5 * m)}-${fmt(6 * m)}`,
    "6-7": `${fmt(6 * m)}-${fmt(7 * m)}`,
    ">7": `>${fmt(7 * m)}`,
  };
  if (label === "All" || label === HIGH_SPEED_RUNNING_EVENT_LABEL) return label;
  return eventBinMode === "classic"
    ? classicLabels[label] || label
    : detailedLabels[label] || label;
}

export function buildStatsColumns({
  styles,
  renderSpeedStatValue,
  fmtWithUnit,
  formatGpsDuration,
  renderInfoHeader,
  isForceProfile,
  formatDistanceKm,
}) {
  return [
    {
      key: "metric",
      header: "",
      cellClassName: styles.statsLabel,
      renderCell: (row) => `${row.fileName} ${row.metricLabel}`,
    },
    {
      key: "min",
      header: "Min",
      cellClassName: styles.statsValue,
      renderCell: (row) =>
        row.metric === "speed"
          ? renderSpeedStatValue(row.values?.min)
          : fmtWithUnit(row.values?.min, row.units.value),
    },
    {
      key: "mean",
      header: "Mean",
      cellClassName: styles.statsValue,
      renderCell: (row) =>
        row.metric === "speed"
          ? renderSpeedStatValue(row.values?.mean)
          : fmtWithUnit(row.values?.mean, row.units.value),
    },
    {
      key: "median",
      header: "Median",
      cellClassName: styles.statsValue,
      renderCell: (row) =>
        row.metric === "speed"
          ? renderSpeedStatValue(row.values?.median)
          : fmtWithUnit(row.values?.median, row.units.value),
    },
    {
      key: "max",
      header: "Max",
      cellClassName: styles.statsValue,
      renderCell: (row) =>
        row.metric === "speed"
          ? renderSpeedStatValue(row.values?.max)
          : fmtWithUnit(row.values?.max, row.units.value),
    },
    {
      key: "duration",
      renderHeader: () => renderInfoHeader("Duration", ["HH:MM:SS.s"]),
      cellClassName: styles.statsValue,
      renderCell: (row) => formatGpsDuration(row.duration),
    },
    {
      key: "area",
      cellClassName: styles.statsValue,
      renderHeader: () =>
        renderInfoHeader("Area", [
          "Speed area = total distance.",
          isForceProfile
            ? "Force area = accumulated impulse."
            : "Acceleration area = accumulated speed change.",
        ]),
      renderCell: (row) =>
        row.metric === "speed"
          ? formatDistanceKm(row.values?.area)
          : row.units.area
            ? fmtWithUnit(row.values?.area, row.units.area)
            : "-",
    },
  ];
}

export function buildEventColumns({
  styles,
  horizontalPowerLabel,
  impulseLabel,
  ratioLabel,
  direction,
  formatEventBinLabel: formatLabel,
  fmtCount,
  formatNumber,
  fmtWithUnit,
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
      cellClassName: styles.statsLabel,
      renderCell: (row) => row.fileName,
    },
    {
      key: "bin",
      header: `Bin (${isForceProfile ? "N" : "m/s²"})`,
      cellClassName: styles.statsValue,
      renderCell: (row) => formatLabel(row.bin),
    },
    {
      key: "count",
      header: "Count",
      cellClassName: styles.statsValue,
      renderCell: (row) => fmtCount(row.values?.count),
    },
    {
      key: "density",
      header: "Density",
      cellClassName: styles.statsValue,
      renderCell: (row) => `${formatNumber(row.values?.density_per_minute)}/min`,
    },
    {
      key: "ratio",
      cellClassName: styles.statsValue,
      renderHeader: () =>
        renderInfoHeader(
          ratioLabel,
          direction === "deceleration"
            ? ["deceleration count / acceleration count."]
            : ["acceleration count / deceleration count."],
        ),
      renderCell: (row) => formatNumber(row.values?.ratio_to_opposite),
    },
    {
      key: "duration",
      header: "Mean duration",
      cellClassName: styles.statsValue,
      renderCell: (row) => formatSecondsValue(row.values?.mean_duration),
    },
    {
      key: "distance",
      header: "Mean distance",
      cellClassName: styles.statsValue,
      renderCell: (row) => fmtWithUnit(row.values?.mean_distance, "m"),
    },
    {
      key: "entrySpeed",
      header: "Mean v entry",
      cellClassName: styles.statsValue,
      renderCell: (row) => renderSpeedWithKmh(row.values?.mean_entry_speed),
    },
    {
      key: "exitSpeed",
      header: "Mean v exit",
      cellClassName: styles.statsValue,
      renderCell: (row) => renderSpeedWithKmh(row.values?.mean_exit_speed),
    },
    {
      key: "average",
      header: isForceProfile
        ? `Mean ${direction === "deceleration" ? "deceleration" : "acceleration"} force`
        : `Mean ${direction === "deceleration" ? "deceleration" : "acceleration"}`,
      cellClassName: styles.statsValue,
      renderCell: (row) => {
        const bodyMassKg = getEventBodyMassKg(row.fileName, direction);
        const averageValue = isForceProfile
          ? Number(row.values?.mean_average_acceleration_magnitude) * bodyMassKg
          : row.values?.mean_average_acceleration_magnitude;
        return fmtWithUnit(averageValue, isForceProfile ? "N" : "m/s²");
      },
    },
    {
      key: "powerPerKg",
      cellClassName: styles.statsValue,
      renderHeader: () =>
        renderInfoHeader(
          `Mean ${isForceProfile ? "" : "relative "}${horizontalPowerLabel}`,
          direction === "deceleration"
            ? [
                `${isForceProfile ? "Braking" : "Relative braking"} power = ${isForceProfile ? "horizontal power" : "relative horizontal power"} (absolute acceleration × speed${isForceProfile ? " × mass" : ""}).`,
              ]
            : [
                `${isForceProfile ? "Propulsive" : "Relative propulsive"} power = ${isForceProfile ? "Braking" : "Relative braking"} power equivalent for acceleration (absolute acceleration × speed${isForceProfile ? " × mass" : ""}).`,
              ],
        ),
      renderCell: (row) => {
        const bodyMassKg = getEventBodyMassKg(row.fileName, direction);
        const value = row.values?.mean_horizontal_power_per_kilogram;
        const scaled = isForceProfile && value != null ? Number(value) * bodyMassKg : value;
        return fmtWithUnit(scaled, isForceProfile ? "W" : "W/kg");
      },
    },
    {
      key: "impulse",
      cellClassName: styles.statsValue,
      renderHeader: () =>
        renderInfoHeader(
          `Mean ${impulseLabel}`,
          direction === "deceleration"
            ? ["Horizontal Braking Impulse = change in momentum [mass × (v exit - v entry)]."]
            : [
                "Horizontal Propulsive Impulse = Horizontal Braking Impulse equivalent for acceleration [HBI = mass × (v exit - v entry)].",
              ],
        ),
      renderCell: (row) => {
        const impulseValue =
          row.values?.mean_horizontal_braking_impulse === undefined ||
          row.values?.mean_horizontal_braking_impulse === null ||
          Number.isNaN(row.values?.mean_horizontal_braking_impulse)
            ? row.values?.mean_horizontal_braking_impulse
            : Math.abs(Number(row.values?.mean_horizontal_braking_impulse));
        return fmtWithUnit(impulseValue, "N·s");
      },
    },
  ];
}

function renderEarlyLateCell(styles, formatValue, earlyValue, lateValue) {
  const absEarly =
    earlyValue === null || earlyValue === undefined || Number.isNaN(Number(earlyValue))
      ? earlyValue
      : Math.abs(Number(earlyValue));
  const absLate =
    lateValue === null || lateValue === undefined || Number.isNaN(Number(lateValue))
      ? lateValue
      : Math.abs(Number(lateValue));
  const ratioText =
    typeof absEarly === "number" && typeof absLate === "number" && absLate !== 0
      ? (absEarly / absLate).toFixed(2)
      : "-";
  return createElement(
    "div",
    { className: styles.earlyLateCell },
    createElement("div", { className: styles.earlyValue }, formatValue(absEarly)),
    createElement("div", { className: styles.lateValue }, formatValue(absLate)),
    createElement("div", { className: styles.ratioValue }, ratioText),
  );
}

export function buildEarlyLateEventColumns({
  styles,
  direction,
  formatEventBinLabel: formatLabel,
  fmtWithUnit,
  formatSecondsValue,
  renderInfoHeader,
  isForceProfile,
  getEventBodyMassKg,
}) {
  const accelUnit = isForceProfile ? "N" : "m/s²";
  const powerUnit = isForceProfile ? "W" : "W/kg";
  const scaleByMass = (fileName, value) =>
    isForceProfile && value !== null && value !== undefined
      ? Number(value) * getEventBodyMassKg(fileName, direction)
      : value;
  const isDecel = direction === "deceleration";

  return [
    {
      key: "fileName",
      header: "Filename",
      cellClassName: styles.statsLabel,
      renderCell: (row) => row.fileName,
    },
    {
      key: "bin",
      header: `Bin (${isForceProfile ? "N" : "m/s²"})`,
      cellClassName: styles.statsValue,
      renderCell: (row) => {
        const label = formatLabel(row.bin);
        return createElement(
          "div",
          { className: styles.earlyLateCell },
          createElement("div", { className: styles.earlyValue }, `${label} early`),
          createElement("div", { className: styles.lateValue }, `${label} late`),
          createElement("div", { className: styles.ratioValue }, `${label} early/late`),
        );
      },
    },
    {
      key: "duration",
      header: "Mean duration",
      cellClassName: styles.statsValue,
      renderCell: (row) =>
        renderEarlyLateCell(
          styles,
          formatSecondsValue,
          row.values?.mean_first_phase_duration,
          row.values?.mean_second_phase_duration,
        ),
    },
    {
      key: "distance",
      header: "Mean distance",
      cellClassName: styles.statsValue,
      renderCell: (row) =>
        renderEarlyLateCell(
          styles,
          (v) => fmtWithUnit(v, "m"),
          row.values?.mean_first_phase_distance,
          row.values?.mean_second_phase_distance,
        ),
    },
    {
      key: "accelAvg",
      header: `Mean ${direction === "deceleration" ? "deceleration" : "acceleration"}${isForceProfile ? " force" : ""} average`,
      cellClassName: styles.statsValue,
      renderCell: (row) =>
        renderEarlyLateCell(
          styles,
          (v) => fmtWithUnit(v, accelUnit),
          scaleByMass(row.fileName, row.values?.mean_first_phase_mean_magnitude),
          scaleByMass(row.fileName, row.values?.mean_second_phase_mean_magnitude),
        ),
    },
    {
      key: "accelPeak",
      header: `Mean ${direction === "deceleration" ? "deceleration" : "acceleration"}${isForceProfile ? " force" : ""} peak`,
      cellClassName: styles.statsValue,
      renderCell: (row) =>
        renderEarlyLateCell(
          styles,
          (v) => fmtWithUnit(v, accelUnit),
          scaleByMass(row.fileName, row.values?.mean_first_phase_peak_magnitude),
          scaleByMass(row.fileName, row.values?.mean_second_phase_peak_magnitude),
        ),
    },
    {
      key: "powerAvg",
      cellClassName: styles.statsValue,
      renderHeader: () =>
        renderInfoHeader(
          `Mean ${isForceProfile ? "" : "relative "}${isDecel ? "BP" : "PP"} average`,
          isDecel
            ? [
                `${isForceProfile ? "Braking" : "Relative braking"} power average = average ${isForceProfile ? "horizontal power" : "relative horizontal power"} [max(absolute acceleration × event speed${isForceProfile ? " × mass" : ""})].`,
              ]
            : [
                `${isForceProfile ? "Propulsive" : "Relative propulsive"} power average = ${isForceProfile ? "" : "relative "}braking power average equivalent for acceleration [mean(absolute acceleration × speed${isForceProfile ? " × mass" : ""})].`,
              ],
        ),
      renderCell: (row) =>
        renderEarlyLateCell(
          styles,
          (v) => fmtWithUnit(v, powerUnit),
          scaleByMass(row.fileName, row.values?.mean_first_phase_mean_power),
          scaleByMass(row.fileName, row.values?.mean_second_phase_mean_power),
        ),
    },
    {
      key: "powerPeak",
      cellClassName: styles.statsValue,
      renderHeader: () =>
        renderInfoHeader(
          `Mean ${isForceProfile ? "" : "relative "}${isDecel ? "BP" : "PP"} peak`,
          isDecel
            ? [
                `${isForceProfile ? "Braking" : "Relative braking"} power peak = peak ${isForceProfile ? "horizontal power" : "relative horizontal power"} [max(absolute acceleration × speed${isForceProfile ? " × mass" : ""})].`,
              ]
            : [
                `${isForceProfile ? "Propulsive" : "Relative propulsive"} power peak = ${isForceProfile ? "" : "relative "}braking power peak equivalent for acceleration [max(absolute acceleration × speed${isForceProfile ? " × mass" : ""})].`,
              ],
        ),
      renderCell: (row) =>
        renderEarlyLateCell(
          styles,
          (v) => fmtWithUnit(v, powerUnit),
          scaleByMass(row.fileName, row.values?.mean_first_phase_peak_power),
          scaleByMass(row.fileName, row.values?.mean_second_phase_peak_power),
        ),
    },
    {
      key: "impulse",
      cellClassName: styles.statsValue,
      renderHeader: () =>
        renderInfoHeader(
          `Mean ${isDecel ? "HBI" : "HPI"}`,
          isDecel
            ? ["Horizontal Braking Impulse = change in momentum [mass × (v exit - v entry)]."]
            : [
                "Horizontal Propulsive Impulse = Horizontal Braking Impulse equivalent for acceleration [HBI = mass × (v exit - v entry)].",
              ],
        ),
      renderCell: (row) =>
        renderEarlyLateCell(
          styles,
          (v) => fmtWithUnit(v, "N·s"),
          row.values?.mean_first_phase_impulse,
          row.values?.mean_second_phase_impulse,
        ),
    },
  ];
}

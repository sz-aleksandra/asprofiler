import { createElement } from "react";

import { getEarlyLateExportValues } from "./analysisColumnHelpers";
import { accelerationToForce } from "../shared/unitConversions";

function renderEarlyLateCell(styles, formatValue, earlyValue, lateValue) {
  const [earlyText, lateText, ratioText] = getEarlyLateExportValues(
    formatValue,
    earlyValue,
    lateValue,
  );
  return createElement(
    "div",
    { className: styles.earlyLateCell },
    createElement("div", { className: styles.earlyValue }, earlyText),
    createElement("div", { className: styles.lateValue }, lateText),
    createElement("div", { className: styles.ratioValue }, ratioText),
  );
}

export function buildEarlyLateEventColumns({
  styles,
  direction,
  formatEventBinLabel: formatLabel,
  formatWithUnit,
  formatSecondsValue,
  renderInfoHeader,
  isForceProfile,
  getEventBodyMassKg,
}) {
  const accelUnit = isForceProfile ? "N" : "m/s²";
  const powerUnit = isForceProfile ? "W" : "W/kg";
  const scaleByMass = (fileName, value) =>
    isForceProfile && value !== null && value !== undefined
      ? accelerationToForce(value, getEventBodyMassKg(fileName, direction))
      : value;
  const isDecel = direction === "deceleration";

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
      exportValue: (row) => formatLabel(row.bin),
    },
    {
      key: "duration",
      header: "Mean duration",
      exportHeader: "Mean duration",
      cellClassName: styles.statsValue,
      renderCell: (row) =>
        renderEarlyLateCell(
          styles,
          formatSecondsValue,
          row.values?.mean_first_phase_duration,
          row.values?.mean_second_phase_duration,
        ),
      exportTripletValue: (row) =>
        getEarlyLateExportValues(
          formatSecondsValue,
          row.values?.mean_first_phase_duration,
          row.values?.mean_second_phase_duration,
        ),
    },
    {
      key: "distance",
      header: "Mean distance",
      exportHeader: "Mean distance",
      cellClassName: styles.statsValue,
      renderCell: (row) =>
        renderEarlyLateCell(
          styles,
          (value) => formatWithUnit(value, "m"),
          row.values?.mean_first_phase_distance,
          row.values?.mean_second_phase_distance,
        ),
      exportTripletValue: (row) =>
        getEarlyLateExportValues(
          (value) => formatWithUnit(value, "m"),
          row.values?.mean_first_phase_distance,
          row.values?.mean_second_phase_distance,
        ),
    },
    {
      key: "accelAvg",
      exportHeader: `Mean ${direction === "deceleration" ? "deceleration" : "acceleration"}${isForceProfile ? " force" : ""} average`,
      header: `Mean ${direction === "deceleration" ? "deceleration" : "acceleration"}${isForceProfile ? " force" : ""} average`,
      cellClassName: styles.statsValue,
      renderCell: (row) =>
        renderEarlyLateCell(
          styles,
          (value) => formatWithUnit(value, accelUnit),
          scaleByMass(row.fileName, row.values?.mean_first_phase_mean_magnitude),
          scaleByMass(row.fileName, row.values?.mean_second_phase_mean_magnitude),
        ),
      exportTripletValue: (row) =>
        getEarlyLateExportValues(
          (value) => formatWithUnit(value, accelUnit),
          scaleByMass(row.fileName, row.values?.mean_first_phase_mean_magnitude),
          scaleByMass(row.fileName, row.values?.mean_second_phase_mean_magnitude),
        ),
    },
    {
      key: "accelPeak",
      exportHeader: `Mean ${direction === "deceleration" ? "deceleration" : "acceleration"}${isForceProfile ? " force" : ""} peak`,
      header: `Mean ${direction === "deceleration" ? "deceleration" : "acceleration"}${isForceProfile ? " force" : ""} peak`,
      cellClassName: styles.statsValue,
      renderCell: (row) =>
        renderEarlyLateCell(
          styles,
          (value) => formatWithUnit(value, accelUnit),
          scaleByMass(row.fileName, row.values?.mean_first_phase_peak_magnitude),
          scaleByMass(row.fileName, row.values?.mean_second_phase_peak_magnitude),
        ),
      exportTripletValue: (row) =>
        getEarlyLateExportValues(
          (value) => formatWithUnit(value, accelUnit),
          scaleByMass(row.fileName, row.values?.mean_first_phase_peak_magnitude),
          scaleByMass(row.fileName, row.values?.mean_second_phase_peak_magnitude),
        ),
    },
    {
      key: "powerAvg",
      cellClassName: styles.statsValue,
      exportHeader: `Mean ${isForceProfile ? "" : "relative "}${isDecel ? "BP" : "PP"} average`,
      renderHeader: () =>
        renderInfoHeader(
          `Mean ${isForceProfile ? "" : "relative "}${isDecel ? "BP" : "PP"} average`,
          isDecel
            ? [
                `${isForceProfile ? "Braking" : "Relative braking"} power average = average ${isForceProfile ? "horizontal power" : "relative horizontal power"} [max(absolute acceleration x event speed${isForceProfile ? " x mass" : ""})].`,
              ]
            : [
                `${isForceProfile ? "Propulsive" : "Relative propulsive"} power average = ${isForceProfile ? "" : "relative "}braking power average equivalent for acceleration [mean(absolute acceleration x speed${isForceProfile ? " x mass" : ""})].`,
              ],
        ),
      renderCell: (row) =>
        renderEarlyLateCell(
          styles,
          (value) => formatWithUnit(value, powerUnit),
          scaleByMass(row.fileName, row.values?.mean_first_phase_mean_power),
          scaleByMass(row.fileName, row.values?.mean_second_phase_mean_power),
        ),
      exportTripletValue: (row) =>
        getEarlyLateExportValues(
          (value) => formatWithUnit(value, powerUnit),
          scaleByMass(row.fileName, row.values?.mean_first_phase_mean_power),
          scaleByMass(row.fileName, row.values?.mean_second_phase_mean_power),
        ),
    },
    {
      key: "powerPeak",
      cellClassName: styles.statsValue,
      exportHeader: `Mean ${isForceProfile ? "" : "relative "}${isDecel ? "BP" : "PP"} peak`,
      renderHeader: () =>
        renderInfoHeader(
          `Mean ${isForceProfile ? "" : "relative "}${isDecel ? "BP" : "PP"} peak`,
          isDecel
            ? [
                `${isForceProfile ? "Braking" : "Relative braking"} power peak = peak ${isForceProfile ? "horizontal power" : "relative horizontal power"} [max(absolute acceleration x speed${isForceProfile ? " x mass" : ""})].`,
              ]
            : [
                `${isForceProfile ? "Propulsive" : "Relative propulsive"} power peak = ${isForceProfile ? "" : "relative "}braking power peak equivalent for acceleration [max(absolute acceleration x speed${isForceProfile ? " x mass" : ""})].`,
              ],
        ),
      renderCell: (row) =>
        renderEarlyLateCell(
          styles,
          (value) => formatWithUnit(value, powerUnit),
          scaleByMass(row.fileName, row.values?.mean_first_phase_peak_power),
          scaleByMass(row.fileName, row.values?.mean_second_phase_peak_power),
        ),
      exportTripletValue: (row) =>
        getEarlyLateExportValues(
          (value) => formatWithUnit(value, powerUnit),
          scaleByMass(row.fileName, row.values?.mean_first_phase_peak_power),
          scaleByMass(row.fileName, row.values?.mean_second_phase_peak_power),
        ),
    },
    {
      key: "impulse",
      cellClassName: styles.statsValue,
      exportHeader: `Mean ${isDecel ? "HBI" : "HPI"}`,
      renderHeader: () =>
        renderInfoHeader(
          `Mean ${isDecel ? "HBI" : "HPI"}`,
          isDecel
            ? [
                "Horizontal Braking Impulse = change in momentum [mass x (exit speed - entry speed)].",
              ]
            : [
                "Horizontal Propulsive Impulse = Horizontal Braking Impulse equivalent for acceleration [HBI = mass x (exit speed - entry speed)].",
              ],
        ),
      renderCell: (row) =>
        renderEarlyLateCell(
          styles,
          (value) => formatWithUnit(value, "N x s"),
          row.values?.mean_first_phase_impulse,
          row.values?.mean_second_phase_impulse,
        ),
      exportTripletValue: (row) =>
        getEarlyLateExportValues(
          (value) => formatWithUnit(value, "N x s"),
          row.values?.mean_first_phase_impulse,
          row.values?.mean_second_phase_impulse,
        ),
    },
  ];
}

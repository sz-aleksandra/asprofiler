import {
  DEFAULT_ANALYSIS_PARAMS,
  HIGH_SPEED_RUNNING_EVENT_LABEL,
} from "../shared/analysisConstants";

const BASELINE_BODY_MASS_KG = DEFAULT_ANALYSIS_PARAMS.body_mass_kg;

function formatBinEdge(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function getAbsoluteNumericValue(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return value;
  return Math.abs(Number(value));
}

export function getEarlyLateExportValues(formatValue, earlyValue, lateValue) {
  const absEarly = getAbsoluteNumericValue(earlyValue);
  const absLate = getAbsoluteNumericValue(lateValue);
  const ratioText =
    typeof absEarly === "number" && typeof absLate === "number" && absLate !== 0
      ? (absEarly / absLate).toFixed(2)
      : "-";

  return [formatValue(absEarly), formatValue(absLate), ratioText];
}

export function formatEventBinLabel(label, eventBinMode, isForceProfile = false) {
  const m = isForceProfile ? BASELINE_BODY_MASS_KG : 1;
  const classicLabels = {
    Low: `Low (${formatBinEdge(1.5 * m)}-${formatBinEdge(2.5 * m)})`,
    High: `High (${formatBinEdge(2.5 * m)}-${formatBinEdge(3.5 * m)})`,
    VeryHigh: `Very High (>=${formatBinEdge(3.5 * m)})`,
  };
  const detailedLabels = {
    "3-4": `${formatBinEdge(3 * m)}-${formatBinEdge(4 * m)}`,
    "4-5": `${formatBinEdge(4 * m)}-${formatBinEdge(5 * m)}`,
    "5-6": `${formatBinEdge(5 * m)}-${formatBinEdge(6 * m)}`,
    "6-7": `${formatBinEdge(6 * m)}-${formatBinEdge(7 * m)}`,
    ">7": `>${formatBinEdge(7 * m)}`,
  };
  if (label === "All" || label === HIGH_SPEED_RUNNING_EVENT_LABEL) return label;
  return eventBinMode === "classic"
    ? classicLabels[label] || label
    : detailedLabels[label] || label;
}

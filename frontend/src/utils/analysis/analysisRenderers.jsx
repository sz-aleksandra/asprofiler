import InfoHeader from "./InfoHeader";

import { metersPerSecondToKmh } from "../shared/unitConversions";

export function renderSpeedStatValue(value, styles) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  const numericValue = Number(value);
  return (
    <span className={styles.stackedStatValue}>
      <span>{numericValue.toFixed(2)} m/s</span>
      <span>({metersPerSecondToKmh(numericValue).toFixed(2)} km/h)</span>
    </span>
  );
}

export function renderInfoHeader(label, tooltipLines, styles) {
  return <InfoHeader label={label} tooltipLines={tooltipLines} styles={styles} />;
}

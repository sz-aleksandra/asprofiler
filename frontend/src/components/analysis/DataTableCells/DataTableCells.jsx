import { mPerSToKmh } from "../../../utils/shared/conversions";

import styles from "./DataTableCells.module.css";

export function renderSpeedStatCellValue(speedStatMPerS) {
  if (speedStatMPerS == null) return "-";
  return (
    <span className={styles.speedStatValue}>
      <span>{speedStatMPerS.toFixed(2)} m/s</span>
      <span>({mPerSToKmh(speedStatMPerS).toFixed(2)} km/h)</span>
    </span>
  );
}

export function renderEarlyLateCell([earlyCellText, lateCellText, ratioCellText]) {
  return (
    <div className={styles.earlyLateCell}>
      <div className={styles.earlyValue}>{earlyCellText}</div>
      <div className={styles.lateValue}>{lateCellText}</div>
      <div className={styles.ratioValue}>{ratioCellText}</div>
    </div>
  );
}

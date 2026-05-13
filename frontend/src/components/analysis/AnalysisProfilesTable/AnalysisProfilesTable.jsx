import { renderInfoHeader } from "../../../utils/analysis/analysisRenderers";
import { exportAspCsv } from "../../../utils/shared/exportAspCsv";
import { hexToRgba } from "../../../utils/shared/hexToRgba";
import styles from "./AnalysisProfilesTable.module.css";

export default function AnalysisProfilesTable({
  rows,
  exportResults,
  allShown,
  shownCount,
  resultsCount,
  onToggleAll,
  onToggleRow,
  onColorChange,
  formatNumber,
  formatSpeedPair,
  fitSlopeLabel,
  isForceProfile,
}) {
  return (
    <div className={styles.table}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <label className={styles.selectAll}>
            <input
              type="checkbox"
              checked={allShown}
              onChange={(event) => onToggleAll(event.target.checked)}
            />
            <span>Show all</span>
          </label>
          <span className={styles.count}>
            {resultsCount} files · {shownCount} shown
          </span>
        </div>
        <button
          className={styles.exportBtn}
          type="button"
          onClick={() => exportAspCsv({ results: exportResults })}
        >
          Export CSV
        </button>
      </div>
      <div className={`${styles.row} ${styles.head}`}>
        <div className={styles.cellToggle}></div>
        <div className={styles.cellName}>Filename</div>
        <div className={styles.cellMetric}>Profile</div>
        <div className={styles.cellFit}>ASP Equation</div>
        <div className={styles.cellMetric}>
          {renderInfoHeader(
            isForceProfile ? "F0" : "A0",
            [
              isForceProfile
                ? "Intercept = hypothetical maximum absolute force."
                : "Intercept = hypothetical maximum absolute acceleration.",
            ],
            styles,
          )}
        </div>
        <div className={styles.cellMetric}>
          {renderInfoHeader("S0", ["Zero crossing speed = hypothetical maximum speed."], styles)}
        </div>
        <div className={styles.cellMetric}>Body mass</div>
        <div className={styles.cellColor}>Color</div>
      </div>
      {rows.map((row) => {
        const profileScale = isForceProfile ? row.bodyMassKg : 1;
        const displayA0 =
          row.fit?.intercept != null
            ? Number(row.fit.intercept) * row.plotMultiplier * profileScale
            : null;
        const displaySlope =
          row.fit?.slope != null ? Number(row.fit.slope) * row.plotMultiplier * profileScale : null;
        const profileSymbol = isForceProfile ? "F" : "a";

        return (
          <div
            className={styles.row}
            key={row.key}
            style={{ background: hexToRgba(row.color, 0.1) }}
          >
            <div className={styles.cellToggle}>
              <input
                type="checkbox"
                checked={!row.hidden}
                onChange={(event) => onToggleRow(row, event.target.checked)}
              />
            </div>
            <div className={styles.cellName}>{row.fileName}</div>
            <div className={styles.cellMetric}>{row.profileLabel}</div>
            <div className={styles.cellFit}>
              {displayA0 != null && displaySlope != null
                ? `${profileSymbol} = ${formatNumber(displayA0)} + (${fitSlopeLabel(displaySlope)}) x v`
                : "-"}
            </div>
            <div className={styles.cellMetric}>
              {displayA0 != null
                ? `${formatNumber(displayA0)} ${isForceProfile ? "N" : "m/s²"}`
                : "-"}
            </div>
            <div className={styles.cellMetric}>
              {row.fit?.zero_crossing_speed != null
                ? formatSpeedPair(row.fit.zero_crossing_speed)
                : "-"}
            </div>
            <div className={styles.cellMetric}>
              {Number.isFinite(row.bodyMassKg) ? `${formatNumber(row.bodyMassKg)} kg` : "-"}
            </div>
            <div className={styles.cellColor}>
              <input
                type="color"
                className={styles.colorInput}
                value={row.color}
                onChange={(event) => onColorChange(row.fileName, event.target.value)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

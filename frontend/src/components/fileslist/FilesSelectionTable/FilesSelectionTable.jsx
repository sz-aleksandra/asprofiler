import PerFileParametersPanel from "../PerFileParametersPanel/PerFileParametersPanel";

import { formatBytes } from "../../../utils/shared/formatBytes";

import styles from "./FilesSelectionTable.module.css";

export default function FilesSelectionTable({
  pendingFiles,
  selected,
  busy,
  allSelected,
  sortedFiles,
  analyze,
  onToggleAll,
  onToggleOne,
  onRemoveOne,
  onRemoveSelected,
  parameters,
  parametersByFile,
  defaultColor,
  colorsMap,
  setColorsMap,
  profilingSpeedUnit,
  onProfilingSpeedUnitChange,
  setParametersByFile,
}) {
  return (
    <div className={styles.table}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <label className={styles.selectAll}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => onToggleAll(!allSelected)}
              disabled={!pendingFiles.length || busy}
            />
            <span>Select all</span>
          </label>
          <span className={styles.count}>
            {pendingFiles.length} files | {selected.size} selected
          </span>
        </div>
        <div className={styles.actionsGroup}>
          <button
            className={styles.primaryBtn}
            onClick={() => analyze([...selected])}
            disabled={!selected.size || busy}
            type="button"
          >
            Analyze selected
          </button>
          <button
            className={styles.dangerBtn}
            onClick={onRemoveSelected}
            disabled={!selected.size || busy}
            type="button"
          >
            Remove selected
          </button>
        </div>
      </div>
      <div className={`${styles.row} ${styles.head}`}>
        <div className={styles.cellCheckbox}></div>
        <div className={styles.cellName}>Filename</div>
        <div className={styles.cellSize}>Size</div>
        <div className={styles.cellActions}></div>
      </div>
      {sortedFiles.map((file) => {
        const checked = selected.has(file.name);
        const perFileParameters = {
          ...parameters,
          ...(parametersByFile[file.name] || {}),
        };
        return (
          <div key={file.name} className={styles.fileBlock}>
            <div className={`${styles.row} ${checked ? styles.rowExpanded : ""}`}>
              <div className={styles.cellCheckbox}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleOne(file.name)}
                  disabled={busy}
                />
              </div>
              <div className={styles.cellName}>{file.name}</div>
              <div className={styles.cellSize}>{formatBytes(file.size)}</div>
              <div className={styles.cellActions}>
                <button
                  className={styles.linkPrimary}
                  onClick={() => analyze([file.name])}
                  disabled={busy}
                  type="button"
                >
                  Analyze
                </button>
                <button
                  className={styles.linkDanger}
                  onClick={() => onRemoveOne(file.name)}
                  disabled={busy}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>
            {checked && (
              <PerFileParametersPanel
                fileName={file.name}
                defaultColor={defaultColor}
                selectedColor={colorsMap[file.name]}
                onColorChange={(color) => {
                  const nextColorsMap = { ...colorsMap, [file.name]: color };
                  setColorsMap(nextColorsMap);
                  localStorage.setItem("analysis_colors_map", JSON.stringify(nextColorsMap));
                }}
                perFileParameters={perFileParameters}
                parametersByFile={parametersByFile}
                setParametersByFile={setParametersByFile}
                profilingSpeedUnit={profilingSpeedUnit}
                onProfilingSpeedUnitChange={onProfilingSpeedUnitChange}
                disabled={busy}
              />
            )}
          </div>
        );
      })}
      {!sortedFiles.length && <div className={styles.emptyRow}>No files selected yet.</div>}
    </div>
  );
}

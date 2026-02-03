import { useMemo } from "react";
import styles from "./FilesTable.module.css";

export default function FilesTable({
  files,
  selected,
  onToggleOne,
  onToggleAll,
  busy,
  mode = "delete",
  onDeleteOne,
  onDeleteSelected,
  onAnalyzeOne,
  onAnalyzeSelected,
}) {
  const allSelected = useMemo(() => {
    if (!files.length) return false;
    return files.every((f) => selected.has(f.name));
  }, [files, selected]);

  const anySelected = selected.size > 0;

  const isDelete = mode === "delete";
  const primaryLabel = isDelete ? "Delete selected" : "Analyze selected";
  const rowLabel = isDelete ? "Delete" : "Analyze";

  const onPrimary = () => {
    if (isDelete) onDeleteSelected?.();
    else onAnalyzeSelected?.();
  };

  const onRowAction = (name) => {
    if (isDelete) onDeleteOne?.(name);
    else onAnalyzeOne?.(name);
  };

  return (
    <section className={styles.card}>
      <div className={styles.toolbar}>
        <div className={styles.left}>
          <label className={styles.selectAll}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => onToggleAll(!allSelected)}
              disabled={!files.length || busy}
            />
            <span>Select all</span>
          </label>

          <span className={styles.count}>
            {files.length} files · {selected.size} selected
          </span>
        </div>

        <button
          className={isDelete ? styles.dangerBtn : styles.primaryBtn}
          onClick={onPrimary}
          disabled={!anySelected || busy}
        >
          {primaryLabel}
        </button>
      </div>

      <div className={styles.table}>
        <div className={`${styles.row} ${styles.head}`}>
          <div className={styles.cellCheckbox}></div>
          <div className={styles.cellName}>Name</div>
          <div className={styles.cellSize}>Size</div>
          <div className={styles.cellActions}></div>
        </div>

        {files.map((f) => {
          const checked = selected.has(f.name);
          return (
            <div className={styles.row} key={f.name}>
              <div className={styles.cellCheckbox}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleOne(f.name)}
                  disabled={busy}
                />
              </div>

              <div className={styles.cellName}>{f.name}</div>
              <div className={styles.cellSize}>{formatBytes(f.size)}</div>

              <div className={styles.cellActions}>
                <button
                  className={isDelete ? styles.linkDanger : styles.linkPrimary}
                  onClick={() => onRowAction(f.name)}
                  disabled={busy}
                >
                  {rowLabel}
                </button>
              </div>
            </div>
          );
        })}

        {!files.length && <div className={styles.empty}>No files available.</div>}
      </div>
    </section>
  );
}

function formatBytes(bytes) {
  const b = Number(bytes ?? 0);
  if (b < 1024) return `${b} B`;
  const kb = b / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

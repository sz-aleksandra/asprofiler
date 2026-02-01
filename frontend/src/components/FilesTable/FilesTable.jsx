import { useMemo } from "react";
import styles from "./FilesTable.module.css";

export default function FilesTable({
  files,
  selected,
  onToggleOne,
  onToggleAll,
  onDeleteOne,
  onDeleteSelected,
  busy,
}) {
  const allSelected = useMemo(() => {
    if (!files.length) return false;
    return files.every((f) => selected.has(f.name));
  }, [files, selected]);

  return (
    <section className={styles.wrap}>
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
          className={styles.dangerBtn}
          onClick={onDeleteSelected}
          disabled={selected.size === 0 || busy}
        >
          Delete selected
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
                  className={styles.dangerBtn}
                  onClick={() => onDeleteOne(f.name)}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {!files.length && <div className={styles.empty}>No files uploaded yet.</div>}
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

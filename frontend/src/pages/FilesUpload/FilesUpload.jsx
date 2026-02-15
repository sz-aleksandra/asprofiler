import { useEffect, useMemo, useState } from "react";

import Dropzone from "../../components/Dropzone/Dropzone";
import Toast from "../../components/Toast/Toast";

import { deleteFile, deleteFiles, listFiles, uploadFiles } from "../../services/filesApi";
import { formatBytes } from "../../utils/formatBytes";

import styles from "./FilesUpload.module.css";

export default function FilesUpload() {
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  const [toast, setToast] = useState({ message: "", type: "info" });

  const closeToast = () => setToast({ message: "", type: "info" });

  const refresh = async () => {
    const data = await listFiles();
    setFiles(data);

    setSelected((prev) => {
      const existing = new Set(data.map((x) => x.name));
      return new Set([...prev].filter((n) => existing.has(n)));
    });
  };

  useEffect(() => {
    refresh().catch((e) => setToast({ message: String(e.message || e), type: "error" }));
  }, []);

  const onFiles = async (picked) => {
    setBusy(true);
    try {
      await uploadFiles(picked);
      await refresh();
      setToast({ message: `Added ${picked.length} file(s).`, type: "success" });
    } catch (e) {
      setToast({ message: String(e.message || e), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onToggleOne = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const onToggleAll = (value) => {
    if (!value) return setSelected(new Set());
    setSelected(new Set(files.map((f) => f.name)));
  };

  const onDeleteOne = async (name) => {
    setBusy(true);
    try {
      await deleteFile(name);
      await refresh();
      setToast({ message: `Deleted: ${name}`, type: "success" });
    } catch (e) {
      setToast({ message: String(e.message || e), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onDeleteSelected = async () => {
    if (!selected.size) return;

    setBusy(true);
    try {
      await deleteFiles([...selected]);
      setSelected(new Set());
      await refresh();
      setToast({ message: "Deleted selected files.", type: "success" });
    } catch (e) {
      setToast({ message: String(e.message || e), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => a.name.localeCompare(b.name));
  }, [files]);
  const allSelected = useMemo(() => {
    if (!sortedFiles.length) return false;
    return sortedFiles.every((f) => selected.has(f.name));
  }, [sortedFiles, selected]);
  const anySelected = selected.size > 0;

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Upload Files</h1>

      <Dropzone onFiles={onFiles} />

      <section className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.left}>
            <label className={styles.selectAll}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleAll(!allSelected)}
                disabled={!sortedFiles.length || busy}
              />
              <span>Select all</span>
            </label>
            <span className={styles.count}>
              {sortedFiles.length} files · {selected.size} selected
            </span>
          </div>

          <button
            className={styles.dangerBtn}
            onClick={onDeleteSelected}
            disabled={!anySelected || busy}
            type="button"
          >
            Delete selected
          </button>
        </div>

        <div className={styles.table}>
          <div className={`${styles.row} ${styles.head}`}>
            <div className={styles.cellCheckbox}></div>
            <div className={styles.cellName}>Filename</div>
            <div className={styles.cellSize}>Size</div>
            <div className={styles.cellActions}></div>
          </div>

          {sortedFiles.map((f) => {
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
                    className={styles.linkDanger}
                    onClick={() => onDeleteOne(f.name)}
                    disabled={busy}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {!sortedFiles.length && <div className={styles.empty}>No files available.</div>}
        </div>
      </section>

      <Toast message={toast.message} type={toast.type} onClose={closeToast} />
    </section>
  );
}

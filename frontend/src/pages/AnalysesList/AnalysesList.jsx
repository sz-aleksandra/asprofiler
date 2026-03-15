import { useEffect, useState } from "react";

import Toast from "../../components/Toast/Toast";
import { deleteAnalysis, listAnalyses } from "../../services/filesApi";

import styles from "./AnalysesList.module.css";

export default function AnalysesList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });

  const closeToast = () => setToast({ message: "", type: "info" });

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await listAnalyses();
      const nextItems = Array.isArray(res?.results) ? res.results : [];
      setItems(nextItems);
      setSelected((prev) => {
        const existing = new Set(nextItems.map((item) => item.analysis_id));
        return new Set([...prev].filter((id) => existing.has(id)));
      });
    } catch (e) {
      setToast({ message: String(e.message || e), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onToggleOne = (analysisId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(analysisId)) next.delete(analysisId);
      else next.add(analysisId);
      return next;
    });
  };

  const onToggleAll = (value) => {
    if (!value) return setSelected(new Set());
    setSelected(new Set(items.map((item) => item.analysis_id)));
  };

  const onDelete = async (analysisId) => {
    setBusy(true);
    try {
      await deleteAnalysis(analysisId);
      await refresh();
      setToast({ message: `Deleted analysis ${analysisId}.`, type: "success" });
    } catch (e) {
      setToast({ message: String(e.message || e), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onDeleteSelected = async () => {
    if (!selected.size) return;
    const ids = [...selected];
    setBusy(true);
    try {
      await Promise.all(ids.map((analysisId) => deleteAnalysis(analysisId)));
      await refresh();
      setToast({ message: "Deleted selected analyses.", type: "success" });
    } catch (e) {
      setToast({ message: String(e.message || e), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const allSelected = items.length > 0 && items.every((item) => selected.has(item.analysis_id));

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Saved Analyses</h1>

      <div className={styles.inlineTable}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <label className={styles.selectAll}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleAll(!allSelected)}
                disabled={!items.length || busy}
              />
              <span>Select all</span>
            </label>
            <span className={styles.count}>
              {loading ? "Loading..." : `${items.length} analyses · ${selected.size} selected`}
            </span>
          </div>
          <button
            className={styles.dangerBtn}
            type="button"
            onClick={onDeleteSelected}
            disabled={!selected.size || busy}
          >
            Delete selected
          </button>
        </div>

        <div className={`${styles.row} ${styles.head}`}>
          <div className={styles.cellCheckbox}></div>
          <div className={styles.cellCreated}>Created</div>
          <div className={styles.cellNames}>Files</div>
          <div className={styles.cellCount}>Count</div>
          <div className={styles.cellActions}></div>
        </div>

        {!loading && items.length === 0 && (
          <div className={styles.emptyRow}>No saved analyses yet.</div>
        )}

        {items.map((item) => {
          const names = Array.isArray(item.names) ? item.names : [];
          const checked = selected.has(item.analysis_id);
          const disabled = busy;
          return (
            <div className={styles.row} key={item.analysis_id}>
              <div className={styles.cellCheckbox}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleOne(item.analysis_id)}
                  disabled={disabled}
                />
              </div>
              <div className={styles.cellCreated}>{new Date(item.created_at).toLocaleString()}</div>
              <div className={styles.cellNames}>{names.length ? names.join(", ") : "—"}</div>
              <div className={styles.cellCount}>{item.result_count ?? 0}</div>
              <div className={styles.cellActions}>
                <button
                  className={styles.linkPrimary}
                  type="button"
                  onClick={() =>
                    window.open(`/analyses/${encodeURIComponent(item.analysis_id)}`, "_blank")
                  }
                  disabled={disabled}
                >
                  Open
                </button>
                <button
                  className={styles.linkDanger}
                  type="button"
                  onClick={() => onDelete(item.analysis_id)}
                  disabled={disabled}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {toast.message && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";

import Dropzone from "../../components/Dropzone/Dropzone";
import Toast from "../../components/Toast/Toast";

import { analyzeFiles, deleteFiles, listFiles, uploadFiles } from "../../services/filesApi";
import { formatBytes } from "../../utils/formatBytes";
import { getCssVar } from "../../utils/getCssVar";

import styles from "./FilesList.module.css";

const DEFAULT_PARAMS = {
  min_speed: 3,
  bin_size: 0.2,
  ci_z: 1.96,
};

export default function FilesList() {
  const [files, setFiles] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingSelected, setPendingSelected] = useState(() => new Set());
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [params, setParams] = useState(() => {
    try {
      const raw = localStorage.getItem("analysis_params");
      if (raw) return { ...DEFAULT_PARAMS, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return DEFAULT_PARAMS;
  });
  const [defaultColor, setDefaultColor] = useState(() => {
    const raw = localStorage.getItem("analysis_default_color");
    return raw || getCssVar("--red");
  });
  const [colorsMap, setColorsMap] = useState(() => {
    try {
      const raw = localStorage.getItem("analysis_colors_map");
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  });
  const [paramsMap, setParamsMap] = useState(() => {
    try {
      const raw = localStorage.getItem("analysis_params_map");
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  });

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

  const onPendingToggleOne = (name) => {
    setPendingSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const onPendingToggleAll = (value) => {
    if (!value) return setPendingSelected(new Set());
    setPendingSelected(new Set(pendingFiles.map((file) => file.name)));
  };

  const onFiles = (picked) => {
    setPendingFiles((prev) => {
      const byName = new Map(prev.map((file) => [file.name, file]));
      picked.forEach((file) => {
        byName.set(file.name, file);
      });
      return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  const onRemovePendingOne = (name) => {
    setPendingFiles((prev) => prev.filter((file) => file.name !== name));
    setPendingSelected((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  };

  const onRemovePendingSelected = () => {
    if (!pendingSelected.size) return;
    setPendingFiles((prev) => prev.filter((file) => !pendingSelected.has(file.name)));
    setPendingSelected(new Set());
  };

  const onUploadSelected = async () => {
    if (!pendingSelected.size) return;
    const filesToUpload = pendingFiles.filter((file) => pendingSelected.has(file.name));
    setBusy(true);
    try {
      await uploadFiles(filesToUpload);
      await refresh();
      setPendingFiles((prev) => prev.filter((file) => !pendingSelected.has(file.name)));
      setPendingSelected(new Set());
      setToast({ message: `Added ${filesToUpload.length} file(s).`, type: "success" });
    } catch (e) {
      setToast({ message: String(e.message || e), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const persistAnalysisSettings = () => {
    localStorage.setItem("analysis_params", JSON.stringify(params));
    localStorage.setItem("analysis_params_map", JSON.stringify(paramsMap));
    localStorage.setItem("analysis_colors_map", JSON.stringify(colorsMap));
    localStorage.setItem("analysis_default_color", defaultColor);
  };

  const analyze = async (names) => {
    if (!names.length) return;
    setBusy(true);
    try {
      const res = await analyzeFiles(
        names.map((name) => ({
          name,
          params: { ...params, ...(paramsMap[name] || {}) },
        })),
        Object.fromEntries(names.map((name) => [name, colorsMap[name] || defaultColor])),
      );
      const okResults = Array.isArray(res?.results)
        ? res.results.filter((item) => item?.profile)
        : [];
      const failedResults = Array.isArray(res?.results)
        ? res.results.filter((item) => item?.error)
        : [];
      if (okResults[0] && res?.analysis_id) {
        persistAnalysisSettings();
        window.open(`/analyses/${encodeURIComponent(res.analysis_id)}`, "_blank");
      }
      const ok = okResults.length;
      const failedMessage = failedResults.length
        ? ` Failed: ${failedResults
            .map((item) => `${item.name} (${item.error})`)
            .join(", ")}`
        : "";
      setToast({
        message: `Analyzed ${ok}/${names.length} file(s): ${names.slice(0, 3).join(", ")}${
          names.length > 3 ? "…" : ""
        }.${failedMessage}`,
        type: ok ? "success" : "error",
      });
    } catch (e) {
      setToast({ message: String(e.message || e), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onDeleteOne = async (name) => {
    setBusy(true);
    try {
      await deleteFiles([name]);
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

  const sortedFiles = useMemo(
    () => [...files].sort((a, b) => a.name.localeCompare(b.name)),
    [files],
  );
  const allPendingSelected =
    pendingFiles.length > 0 && pendingFiles.every((file) => pendingSelected.has(file.name));

  const allSelected = files.length > 0 && files.every((f) => selected.has(f.name));

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Files</h1>

      <Dropzone onFiles={onFiles} />

      <div className={styles.inlineTable}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <label className={styles.selectAll}>
              <input
                type="checkbox"
                checked={allPendingSelected}
                onChange={() => onPendingToggleAll(!allPendingSelected)}
                disabled={!pendingFiles.length || busy}
              />
              <span>Select all</span>
            </label>
            <span className={styles.count}>
              {pendingFiles.length} files to upload · {pendingSelected.size} selected
            </span>
          </div>
          <div className={styles.actionsGroup}>
            <button
              className={styles.primaryBtn}
              onClick={onUploadSelected}
              disabled={!pendingSelected.size || busy}
              type="button"
            >
              Upload selected
            </button>
            <button
              className={styles.dangerBtn}
              onClick={onRemovePendingSelected}
              disabled={!pendingSelected.size || busy}
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
        {pendingFiles.map((file) => (
          <div className={styles.row} key={file.name}>
            <div className={styles.cellCheckbox}>
              <input
                type="checkbox"
                checked={pendingSelected.has(file.name)}
                onChange={() => onPendingToggleOne(file.name)}
                disabled={busy}
              />
            </div>
            <div className={styles.cellName}>{file.name}</div>
            <div className={styles.cellSize}>{formatBytes(file.size)}</div>
            <div className={styles.cellActions}>
              <button
                className={styles.linkDanger}
                onClick={() => onRemovePendingOne(file.name)}
                disabled={busy}
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {!pendingFiles.length && <div className={styles.emptyRow}>No files selected for upload.</div>}
      </div>

      <div className={styles.controls}>
        <div className={styles.sectionTitle}>Analysis preset</div>
        <div className={styles.controlRow}>
          <label className={styles.controlLabel}>
            Min speed
            <input
              className={styles.controlInput}
              type="number"
              step="0.1"
              value={params.min_speed}
              onChange={(e) => setParams((p) => ({ ...p, min_speed: Number(e.target.value) }))}
              disabled={busy}
            />
          </label>
          <label className={styles.controlLabel}>
            Bin size
            <input
              className={styles.controlInput}
              type="number"
              step="0.1"
              value={params.bin_size}
              onChange={(e) => setParams((p) => ({ ...p, bin_size: Number(e.target.value) }))}
              disabled={busy}
            />
          </label>
          <label className={styles.controlLabel}>
            CI (z)
            <input
              className={styles.controlInput}
              type="number"
              step="0.01"
              value={params.ci_z}
              onChange={(e) => setParams((p) => ({ ...p, ci_z: Number(e.target.value) }))}
              disabled={busy}
            />
          </label>
          <label className={styles.controlLabel}>
            Default color
            <input
              className={styles.colorInput}
              type="color"
              value={defaultColor}
              onChange={(e) => {
                setDefaultColor(e.target.value);
                localStorage.setItem("analysis_default_color", e.target.value);
              }}
              disabled={busy}
            />
          </label>
        </div>
      </div>

      <div className={styles.inlineTable}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
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
              {files.length} uploaded files · {selected.size} selected
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
              onClick={onDeleteSelected}
              disabled={!selected.size || busy}
              type="button"
            >
              Delete selected
            </button>
          </div>
        </div>
        <div className={`${styles.row} ${styles.head}`}>
          <div className={styles.cellCheckbox}></div>
          <div className={styles.cellName}>Filename</div>
          <div className={styles.cellSize}>Size</div>
          <div className={styles.cellActions}></div>
        </div>
        {sortedFiles.map((f) => {
          const checked = selected.has(f.name);
          const perParams = { ...params, ...(paramsMap[f.name] || {}) };
          return (
            <div key={f.name} className={styles.fileBlock}>
              <div className={`${styles.row} ${checked ? styles.rowExpanded : ""}`}>
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
                    className={styles.linkPrimary}
                    onClick={() => analyze([f.name])}
                    disabled={busy}
                    type="button"
                  >
                    Analyze
                  </button>
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
              {checked && (
                <div className={styles.inlinePanel}>
                  <label className={styles.controlLabel}>
                    Color
                    <input
                      className={styles.colorInput}
                      type="color"
                      value={colorsMap[f.name] || defaultColor}
                      onChange={(e) => {
                        const next = { ...colorsMap, [f.name]: e.target.value };
                        setColorsMap(next);
                        localStorage.setItem("analysis_colors_map", JSON.stringify(next));
                      }}
                      disabled={busy}
                    />
                  </label>
                  <label className={styles.controlLabel}>
                    Min speed
                    <input
                      className={styles.controlInput}
                      type="number"
                      step="0.1"
                      value={perParams.min_speed}
                      onChange={(e) => {
                        const next = {
                          ...paramsMap,
                          [f.name]: { ...perParams, min_speed: Number(e.target.value) },
                        };
                        setParamsMap(next);
                        localStorage.setItem("analysis_params_map", JSON.stringify(next));
                      }}
                      disabled={busy}
                    />
                  </label>
                  <label className={styles.controlLabel}>
                    Bin size
                    <input
                      className={styles.controlInput}
                      type="number"
                      step="0.1"
                      value={perParams.bin_size}
                      onChange={(e) => {
                        const next = {
                          ...paramsMap,
                          [f.name]: { ...perParams, bin_size: Number(e.target.value) },
                        };
                        setParamsMap(next);
                        localStorage.setItem("analysis_params_map", JSON.stringify(next));
                      }}
                      disabled={busy}
                    />
                  </label>
                  <label className={styles.controlLabel}>
                    CI (z)
                    <input
                      className={styles.controlInput}
                      type="number"
                      step="0.01"
                      value={perParams.ci_z}
                      onChange={(e) => {
                        const next = {
                          ...paramsMap,
                          [f.name]: { ...perParams, ci_z: Number(e.target.value) },
                        };
                        setParamsMap(next);
                        localStorage.setItem("analysis_params_map", JSON.stringify(next));
                      }}
                      disabled={busy}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
        {!sortedFiles.length && <div className={styles.emptyRow}>No files available.</div>}
      </div>

      <Toast message={toast.message} type={toast.type} onClose={closeToast} />
    </section>
  );
}

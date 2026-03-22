import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Dropzone from "../../components/Dropzone/Dropzone";
import Toast from "../../components/Toast/Toast";

import { analyzeFiles } from "../../services/filesApi";
import { formatBytes } from "../../utils/formatBytes";
import { getCssVar } from "../../utils/getCssVar";
import { normalizeGpsCsvFile } from "../../utils/normalizeGpsCsv";

import styles from "./FilesList.module.css";

const DEFAULT_PARAMS = {
  min_speed: 3,
  bin_size: 0.2,
  ci_z: 1.96,
};

export default function FilesList() {
  const navigate = useNavigate();
  const [pendingFiles, setPendingFiles] = useState([]);
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
    return setSelected(new Set(pendingFiles.map((file) => file.name)));
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

  const onRemoveOne = (name) => {
    setPendingFiles((prev) => prev.filter((file) => file.name !== name));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  };

  const onRemoveSelected = () => {
    if (!selected.size) return;
    setPendingFiles((prev) => prev.filter((file) => !selected.has(file.name)));
    setSelected(new Set());
  };

  const persistAnalysisSettings = () => {
    localStorage.setItem("analysis_params", JSON.stringify(params));
    localStorage.setItem("analysis_params_map", JSON.stringify(paramsMap));
    localStorage.setItem("analysis_colors_map", JSON.stringify(colorsMap));
    localStorage.setItem("analysis_default_color", defaultColor);
  };

  const analyze = async (names) => {
    if (!names.length) return;
    const filesToAnalyze = pendingFiles.filter((file) => names.includes(file.name));
    if (!filesToAnalyze.length) return;

    setBusy(true);
    try {
      const processed = await Promise.all(
        filesToAnalyze.map(async (file) => {
          try {
            const normalized = await normalizeGpsCsvFile(file);
            return { name: file.name, file: normalized };
          } catch (error) {
            return { name: file.name, error: String(error.message || error) };
          }
        }),
      );
      const readyFiles = processed.filter((item) => item.file).map((item) => item.file);
      const failedPreprocessing = processed.filter((item) => item.error);

      if (!readyFiles.length) {
        throw new Error(
          failedPreprocessing.map((item) => `${item.name} (${item.error})`).join(", ") ||
            "No files could be preprocessed",
        );
      }

      const res = await analyzeFiles(readyFiles, params, paramsMap);
      const okResults = Array.isArray(res?.results)
        ? res.results.filter((item) => item?.profile)
        : [];
      const failedResults = [
        ...failedPreprocessing.map((item) => ({ name: item.name, error: item.error })),
        ...(Array.isArray(res?.results) ? res.results.filter((item) => item?.error) : []),
      ];

      if (okResults.length) {
        persistAnalysisSettings();
        navigate("/analysis", {
          state: {
            results: okResults,
            color_map: Object.fromEntries(
              okResults.map((item) => [item.name, colorsMap[item.name] || defaultColor]),
            ),
          },
        });
      }

      const failedMessage = failedResults.length
        ? ` Failed: ${failedResults.map((item) => `${item.name} (${item.error})`).join(", ")}`
        : "";
      setToast({
        message: `Analyzed ${okResults.length}/${names.length} file(s): ${names
          .slice(0, 3)
          .join(", ")}${names.length > 3 ? "…" : ""}.${failedMessage}`,
        type: okResults.length ? "success" : "error",
      });
    } catch (e) {
      setToast({ message: String(e.message || e), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const allSelected =
    pendingFiles.length > 0 && pendingFiles.every((file) => selected.has(file.name));

  const sortedFiles = useMemo(
    () => [...pendingFiles].sort((a, b) => a.name.localeCompare(b.name)),
    [pendingFiles],
  );

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Files</h1>

      <Dropzone onFiles={onFiles} />

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
                disabled={!pendingFiles.length || busy}
              />
              <span>Select all</span>
            </label>
            <span className={styles.count}>
              {pendingFiles.length} files ready for analysis · {selected.size} selected
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
          const perParams = { ...params, ...(paramsMap[file.name] || {}) };
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
                <div className={styles.inlinePanel}>
                  <label className={styles.controlLabel}>
                    Color
                    <input
                      className={styles.colorInput}
                      type="color"
                      value={colorsMap[file.name] || defaultColor}
                      onChange={(e) => {
                        const next = { ...colorsMap, [file.name]: e.target.value };
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
                          [file.name]: { ...perParams, min_speed: Number(e.target.value) },
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
                          [file.name]: { ...perParams, bin_size: Number(e.target.value) },
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
                          [file.name]: { ...perParams, ci_z: Number(e.target.value) },
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
        {!sortedFiles.length && <div className={styles.emptyRow}>No files selected yet.</div>}
      </div>

      <Toast message={toast.message} type={toast.type} onClose={closeToast} />
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";

import Toast from "../../components/Toast/Toast";

import { analyzeFiles, listFiles } from "../../services/filesApi";
import { formatBytes } from "../../utils/formatBytes";

import styles from "./FilesList.module.css";

export default function FilesList() {
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [params, setParams] = useState(() => {
    try {
      const raw = localStorage.getItem("analysis_params");
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return { min_speed: 3, bin_size: 0.2, ci_z: 1.96 };
  });
  const [defaultColor, setDefaultColor] = useState(() => {
    const raw = localStorage.getItem("analysis_default_color");
    return raw || "#000000";
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

  const onAnalyzeOne = async (name) => {
    setBusy(true);
    try {
      const per = paramsMap[name] || params;
      const res = await analyzeFiles([name], per);
      const first = res?.results?.[0]?.profile?.fit;
      if (first) {
        const payload = [{ name, profile: res.results[0].profile }];
        localStorage.setItem("analysis_results", JSON.stringify(payload));
        localStorage.setItem("analysis_params", JSON.stringify(params));
        localStorage.setItem("analysis_params_map", JSON.stringify(paramsMap));
        localStorage.setItem("analysis_colors_map", JSON.stringify(colorsMap));
        localStorage.setItem("analysis_default_color", defaultColor);
        window.open("/analysis", "_blank", "noopener,noreferrer");
        setToast({
          message: `Analyzed ${name}. A0=${first.A0.toFixed(3)}, S0=${first.S0.toFixed(
            3,
          )}, slope=${first.AS_slope.toFixed(3)}, R²=${first.r2.toFixed(3)}`,
          type: "success",
        });
      } else {
        setToast({ message: `Analyzed ${name}.`, type: "success" });
      }
    } catch (e) {
      setToast({ message: String(e.message || e), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onAnalyzeSelected = async () => {
    if (!selected.size) return;
    setBusy(true);
    try {
      const names = [...selected];
      const updates = await Promise.all(
        names.map(async (n) => {
          const per = paramsMap[n] || params;
          const res = await analyzeFiles([n], per);
          const first = res?.results?.[0];
          if (first?.profile) return { name: n, profile: first.profile };
          return null;
        }),
      );
      const okResults = updates.filter(Boolean);
      const ok = okResults.length;
      if (okResults[0]) {
        const payload = okResults.map((r) => ({ name: r.name, profile: r.profile }));
        localStorage.setItem("analysis_results", JSON.stringify(payload));
        localStorage.setItem("analysis_params", JSON.stringify(params));
        localStorage.setItem("analysis_params_map", JSON.stringify(paramsMap));
        localStorage.setItem("analysis_colors_map", JSON.stringify(colorsMap));
        localStorage.setItem("analysis_default_color", defaultColor);
        window.open("/analysis", "_blank", "noopener,noreferrer");
      }
      setToast({
        message: `Analyzed ${ok}/${selected.size} file(s): ${[...selected].slice(0, 3).join(", ")}${
          selected.size > 3 ? "…" : ""
        }`,
        type: ok ? "success" : "error",
      });
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

  const allSelected = files.length > 0 && files.every((f) => selected.has(f.name));

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Files List</h1>

      <div className={styles.controls}>
        <div className={styles.sectionTitle}>Global preset</div>
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
              {files.length} files · {selected.size} selected
            </span>
          </div>
          <button
            className={styles.primaryBtn}
            onClick={onAnalyzeSelected}
            disabled={!selected.size || busy}
            type="button"
          >
            Analyze selected
          </button>
        </div>
        <div className={`${styles.row} ${styles.head}`}>
          <div className={styles.cellCheckbox}></div>
          <div className={styles.cellName}>Filename</div>
          <div className={styles.cellSize}>Size</div>
          <div className={styles.cellActions}></div>
        </div>
        {sortedFiles.map((f) => {
          const checked = selected.has(f.name);
          const perParams = paramsMap[f.name] || {
            min_speed: params.min_speed,
            bin_size: params.bin_size,
            ci_z: params.ci_z,
          };
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
                    onClick={() => onAnalyzeOne(f.name)}
                    disabled={busy}
                    type="button"
                  >
                    Analyze
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

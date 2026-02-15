import { useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import AspChart from "../../components/AspChart/AspChart";
import TimeSeriesChart from "../../components/TimeSeriesChart/TimeSeriesChart";

import styles from "./Analysis.module.css";

export default function Analysis() {
  const location = useLocation();

  const analysis = useMemo(() => {
    const state = location.state;
    if (state && state.results) return state.results;
    const raw = localStorage.getItem("analysis_results");
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }, [location.state]);

  const [results, setResults] = useState(analysis);

  useEffect(() => {
    setResults(analysis);
  }, [analysis]);

  const [colors, setColors] = useState(() => {
    const raw = localStorage.getItem("analysis_colors_map");
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  });
  const defaultColor = localStorage.getItem("analysis_default_color") || "#000000";
  const [hiddenMap, setHiddenMap] = useState(() => {
    const raw = localStorage.getItem("analysis_hidden_map");
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("analysis_hidden_map", JSON.stringify(hiddenMap));
  }, [hiddenMap]);
  const [selectedPoints, setSelectedPoints] = useState(() => {
    const raw = localStorage.getItem("analysis_selected_points");
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (p) => p?.name && Number.isInteger(Number(p?.index)) && Number.isFinite(Number(p?.time)),
      );
    } catch {
      return [];
    }
  });
  const [disabledPointMap, setDisabledPointMap] = useState({});
  const [pointWindow, setPointWindow] = useState(10);
  const [timeWindowSec, setTimeWindowSec] = useState(10);
  const visibleResults = results.filter((r) => !hiddenMap[r.name]);
  const pointKey = (p) => `${p.name}::${p.index}`;
  const activeSelectedPoints = selectedPoints.filter((p) => !disabledPointMap[pointKey(p)]);
  const visibleFileNames = new Set(visibleResults.map((r) => r.name));
  const visibleSelectedPoints = selectedPoints.filter((p) => visibleFileNames.has(p.name));
  const activeVisibleSelectedPoints = activeSelectedPoints.filter((p) =>
    visibleFileNames.has(p.name),
  );
  useEffect(() => {
    localStorage.setItem("analysis_selected_points", JSON.stringify(selectedPoints));
  }, [selectedPoints]);

  const combinedTimeseries = useMemo(() => {
    const speedSeries = [];
    const accelerationSeries = [];
    const heartrateSeries = [];

    visibleResults.forEach((item) => {
      const ts = item.profile?.timeseries || {};
      const color = colors[item.name] || defaultColor;
      const seriesName = item.name;

      if (ts.time?.length && ts.speed?.length) {
        speedSeries.push({ name: seriesName, values: ts.speed, color, x: ts.time });
      }
      if (ts.time?.length && ts.acceleration?.length) {
        accelerationSeries.push({
          name: seriesName,
          values: ts.acceleration,
          color,
          x: ts.time,
        });
      }
      if (ts.time?.length && ts.heartrate?.length) {
        heartrateSeries.push({ name: seriesName, values: ts.heartrate, color, x: ts.time });
      }
    });

    return { speedSeries, accelerationSeries, heartrateSeries };
  }, [visibleResults, colors, defaultColor]);

  const combinedStatsRows = useMemo(() => {
    const rows = [];
    visibleResults.forEach((item) => {
      const stats = item.profile?.stats || {};
      rows.push({ label: `${item.name} Speed`, values: stats.speed });
    });
    visibleResults.forEach((item) => {
      const stats = item.profile?.stats || {};
      rows.push({
        label: `${item.name} Acceleration`,
        values: stats.acceleration,
      });
    });
    visibleResults.forEach((item) => {
      const stats = item.profile?.stats || {};
      if (stats.heartrate) {
        rows.push({
          label: `${item.name} Heartrate`,
          values: stats.heartrate,
        });
      }
    });
    return rows;
  }, [visibleResults]);

  const fmt = (v) =>
    v === undefined || v === null || Number.isNaN(v) ? "—" : Number(v).toFixed(3);
  const xAxisTitle = "Time from start (s)";
  const allShown = results.length > 0 && results.every((r) => !hiddenMap[r.name]);
  const shownCount = results.filter((r) => !hiddenMap[r.name]).length;
  const onAspPointSelect = (point) => {
    if (!point || !Number.isInteger(Number(point.index))) return;
    const key = `${point.name}::${Number(point.index)}`;
    setSelectedPoints((prev) => {
      const exists = prev.some((p) => `${p.name}::${p.index}` === key);
      if (exists) {
        setDisabledPointMap((map) => {
          const next = { ...map };
          delete next[key];
          return next;
        });
        return prev.filter((p) => `${p.name}::${p.index}` !== key);
      }
      return [...prev, { ...point, index: Number(point.index) }];
    });
  };
  const allPointsActive =
    visibleSelectedPoints.length > 0 &&
    visibleSelectedPoints.every((p) => !disabledPointMap[pointKey(p)]);

  if (analysis.length === 0) {
    return (
      <section className={styles.page}>
        <h1 className={styles.title}>Analysis</h1>
        <div className={styles.empty}>No analysis data yet.</div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Analysis</h1>

      <div className={styles.controls}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <label className={styles.selectAll}>
              <input
                type="checkbox"
                checked={allShown}
                onChange={(e) => {
                  if (e.target.checked) {
                    setHiddenMap({});
                    return;
                  }
                  const next = {};
                  results.forEach((r) => {
                    next[r.name] = true;
                  });
                  setHiddenMap(next);
                }}
              />
              <span>Show all</span>
            </label>
            <span className={styles.count}>
              {results.length} files · {shownCount} shown
            </span>
          </div>
          <button
            className={styles.secondaryBtn}
            type="button"
            onClick={() => {
              const next = {};
              results.forEach((r) => {
                next[r.name] = true;
              });
              setHiddenMap(next);
            }}
          >
            Hide all
          </button>
        </div>
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.head}`}>
            <div className={styles.cellCheckbox}>Show</div>
            <div className={styles.cellName}>Filename</div>
            <div className={styles.cellColor}>Color</div>
          </div>
          {results.map((item) => (
            <div className={styles.row} key={item.name}>
              <div className={styles.cellCheckbox}>
                <input
                  type="checkbox"
                  checked={!hiddenMap[item.name]}
                  onChange={(e) => {
                    setHiddenMap((prev) => ({
                      ...prev,
                      [item.name]: !e.target.checked,
                    }));
                  }}
                />
              </div>
              <div className={styles.cellName}>{item.name}</div>
              <div className={styles.cellColor}>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={colors[item.name] || defaultColor}
                  onChange={(e) => {
                    const next = { ...colors, [item.name]: e.target.value };
                    localStorage.setItem("analysis_colors_map", JSON.stringify(next));
                    setColors(next);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      {visibleResults.length === 0 ? (
        <div className={styles.empty}>All series hidden. Use “Show”.</div>
      ) : (
        <AspChart
          profiles={visibleResults}
          title="Acceleration Speed Profile"
          colorMap={colors}
          defaultColor={defaultColor}
          onPointSelect={onAspPointSelect}
          selectedPoints={activeVisibleSelectedPoints}
          pointWindow={pointWindow}
        />
      )}
      <div className={styles.selectionSection}>
        <div className={styles.selectionToolbar}>
          <div className={styles.selectionToolbarLeft}>
            <label className={styles.selectAll}>
              <input
                type="checkbox"
                checked={allPointsActive}
                disabled={!visibleSelectedPoints.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setDisabledPointMap((prev) => {
                      const next = { ...prev };
                      visibleSelectedPoints.forEach((p) => {
                        delete next[pointKey(p)];
                      });
                      return next;
                    });
                    return;
                  }
                  setDisabledPointMap((prev) => {
                    const next = { ...prev };
                    visibleSelectedPoints.forEach((p) => {
                      next[pointKey(p)] = true;
                    });
                    return next;
                  });
                }}
              />
              <span>Select all</span>
            </label>
            <div className={styles.selectionSummary}>
              {visibleSelectedPoints.length} points · {activeVisibleSelectedPoints.length} active
            </div>
          </div>
          <div className={styles.selectionControls}>
            <label className={styles.selectionLabel}>
              +/- points
              <input
                className={styles.selectionInput}
                type="number"
                min={1}
                step={1}
                value={pointWindow}
                onChange={(e) => setPointWindow(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
            <label className={styles.selectionLabel}>
              +/- seconds
              <input
                className={styles.selectionInput}
                type="number"
                min={1}
                step={1}
                value={timeWindowSec}
                onChange={(e) => setTimeWindowSec(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
            <button
            className={styles.selectionDangerBtn}
            type="button"
            disabled={!visibleSelectedPoints.length}
            onClick={() => {
              const visibleKeys = new Set(visibleSelectedPoints.map(pointKey));
              setSelectedPoints((prev) => prev.filter((p) => !visibleKeys.has(pointKey(p))));
              setDisabledPointMap((prev) => {
                const next = { ...prev };
                visibleSelectedPoints.forEach((p) => {
                  delete next[pointKey(p)];
                });
                return next;
              });
            }}
          >
            Clear selection
          </button>
        </div>
        </div>
        <div className={styles.selectionTable}>
          <div className={`${styles.row} ${styles.head} ${styles.selectionRow} ${styles.selectionHead}`}>
            <div className={styles.selectionCellCheckbox}></div>
            <div className={styles.selectionFile}>Filename</div>
            <div className={styles.selectionCol}>Time</div>
            <div className={styles.selectionCol}>Speed</div>
            <div className={styles.selectionCol}>Accel</div>
            <div className={styles.selectionActions}></div>
          </div>
          {visibleSelectedPoints.length === 0 && (
            <div className={styles.selectionEmpty}>No selected points.</div>
          )}
          {visibleSelectedPoints.map((p, i) => (
            <div className={`${styles.row} ${styles.selectionRow}`} key={`${p.name}-${p.index}-${i}`}>
              <div className={styles.selectionCellCheckbox}>
                <input
                  type="checkbox"
                  checked={!disabledPointMap[pointKey(p)]}
                  onChange={(e) => {
                    const key = pointKey(p);
                    setDisabledPointMap((prev) => {
                      const next = { ...prev };
                      if (e.target.checked) delete next[key];
                      else next[key] = true;
                      return next;
                    });
                  }}
                />
              </div>
              <div className={styles.selectionFile}>{p.name}</div>
              <div className={styles.selectionCol}>{fmt(p.time)}s</div>
              <div className={styles.selectionCol}>{fmt(p.speed)}</div>
              <div className={styles.selectionCol}>{fmt(p.accel)}</div>
              <div className={styles.selectionActions}>
                <button
                  className={styles.selectionRemoveBtn}
                  type="button"
                  onClick={() => {
                    const key = pointKey(p);
                    setSelectedPoints((prev) => prev.filter((x) => pointKey(x) !== key));
                    setDisabledPointMap((prev) => {
                      const next = { ...prev };
                      delete next[key];
                      return next;
                    });
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {visibleResults.length > 0 && (
        <section className={styles.fileSection}>
          <div className={styles.statsCard}>
            <div className={`${styles.statsRow} ${styles.statsHead}`}>
              <span></span>
              <span>Min</span>
              <span>Mean</span>
              <span>Median</span>
              <span>Max</span>
            </div>
            {combinedStatsRows.map((row) => (
              <div className={styles.statsRow} key={row.label}>
                <span className={styles.statsLabel}>{row.label}</span>
                <span className={styles.statsValue}>{fmt(row.values?.min)}</span>
                <span className={styles.statsValue}>{fmt(row.values?.mean)}</span>
                <span className={styles.statsValue}>{fmt(row.values?.median)}</span>
                <span className={styles.statsValue}>{fmt(row.values?.max)}</span>
              </div>
            ))}
          </div>

          <div className={styles.timeseriesGrid}>
            <TimeSeriesChart
              title="Speed"
              series={combinedTimeseries.speedSeries}
              xTitle={xAxisTitle}
              selectedPoints={activeVisibleSelectedPoints}
              pointWindow={pointWindow}
              timeWindowSec={timeWindowSec}
            />
            <TimeSeriesChart
              title="Acceleration"
              series={combinedTimeseries.accelerationSeries}
              xTitle={xAxisTitle}
              selectedPoints={activeVisibleSelectedPoints}
              pointWindow={pointWindow}
              timeWindowSec={timeWindowSec}
            />
            {combinedTimeseries.heartrateSeries.length > 0 && (
              <TimeSeriesChart
                title="Heartrate"
                series={combinedTimeseries.heartrateSeries}
                xTitle={xAxisTitle}
                selectedPoints={activeVisibleSelectedPoints}
                pointWindow={pointWindow}
                timeWindowSec={timeWindowSec}
              />
            )}
          </div>
        </section>
      )}
    </section>
  );
}

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
  const [hiddenMap, setHiddenMap] = useState({});
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [markedPointMap, setMarkedPointMap] = useState({});
  const [pointWindow, setPointWindow] = useState(10);
  const [timeWindowSec, setTimeWindowSec] = useState(10);
  const [pointsSortRules, setPointsSortRules] = useState([]);
  const visibleResults = results.filter((r) => !hiddenMap[r.name]);
  const pointKey = (p) => `${p.name}::${p.index}`;
  const visibleFileNames = new Set(visibleResults.map((r) => r.name));
  const visibleSelectedPoints = selectedPoints.filter((p) => visibleFileNames.has(p.name));
  const selectedVisibleCount = visibleSelectedPoints.filter((p) => markedPointMap[pointKey(p)]).length;
  const filteredSelectedPoints = useMemo(() => {
    const sorted = [...visibleSelectedPoints];
    if (!pointsSortRules.length) return sorted;

    sorted.sort((a, b) => {
      for (const rule of pointsSortRules) {
        let cmp = 0;
        if (rule.key === "name") cmp = String(a.name).localeCompare(String(b.name));
        if (rule.key === "time") cmp = Number(a.time) - Number(b.time);
        if (rule.key === "speed") cmp = Number(a.speed) - Number(b.speed);
        if (rule.key === "accel") cmp = Number(a.accel) - Number(b.accel);
        if (cmp !== 0) return rule.dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
    return sorted;
  }, [visibleSelectedPoints, pointsSortRules]);

  const toggleSortRule = (key) => {
    setPointsSortRules((prev) => {
      const idx = prev.findIndex((r) => r.key === key);
      if (idx === -1) return [...prev, { key, dir: "asc" }];
      const current = prev[idx];
      if (current.dir === "asc") {
        const next = [...prev];
        next[idx] = { ...current, dir: "desc" };
        return next;
      }
      return prev.filter((r) => r.key !== key);
    });
  };

  const sortBadge = (key) => {
    const idx = pointsSortRules.findIndex((r) => r.key === key);
    if (idx === -1) return "";
    const dir = pointsSortRules[idx].dir === "asc" ? "↑" : "↓";
    return ` ${dir}(${idx + 1})`;
  };

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
  const speedReferenceLines = useMemo(
    () =>
      visibleResults
        .map((item) => ({
          y: Number(item?.profile?.meta?.min_speed),
          color: colors[item.name] || defaultColor,
          width: 1.5,
          dash: "dash",
        }))
        .filter((line) => Number.isFinite(line.y)),
    [visibleResults, colors, defaultColor],
  );

  const combinedStatsRows = useMemo(() => {
    const rows = [];
    visibleResults.forEach((item) => {
      const stats = item.profile?.stats || {};
      rows.push({ label: `${item.name} Speed`, values: stats.speed, metric: "speed" });
    });
    visibleResults.forEach((item) => {
      const stats = item.profile?.stats || {};
      rows.push({
        label: `${item.name} Acceleration`,
        values: stats.acceleration,
        metric: "acceleration",
      });
    });
    visibleResults.forEach((item) => {
      const stats = item.profile?.stats || {};
      if (stats.heartrate) {
        rows.push({
          label: `${item.name} Heartrate`,
          values: stats.heartrate,
          metric: "heartrate",
        });
      }
    });
    return rows;
  }, [visibleResults]);

  const fmt = (v) =>
    v === undefined || v === null || Number.isNaN(v) ? "—" : Number(v).toFixed(3);
  const fmtWithUnit = (v, unit) => {
    if (v === undefined || v === null || Number.isNaN(v)) return "—";
    return `${Number(v).toFixed(3)} ${unit}`;
  };
  const metricUnits = (metric) => {
    if (metric === "speed") return { value: "m/s", area: "m" };
    if (metric === "acceleration") return { value: "m/s²", area: "m/s" };
    if (metric === "heartrate") return { value: "bpm", area: null };
    return { value: "", area: null };
  };
  const xAxisTitle = "Time from start (s)";
  const allShown = results.length > 0 && results.every((r) => !hiddenMap[r.name]);
  const shownCount = results.filter((r) => !hiddenMap[r.name]).length;
  const onAspPointSelect = (point) => {
    const idx = Number(point?.index);
    const t = Number(point?.time);
    if (!point?.name || !Number.isInteger(idx) || idx < 0 || !Number.isFinite(t)) return;
    const key = `${point.name}::${idx}`;
    setSelectedPoints((prev) => {
      const exists = prev.some((p) => `${p.name}::${p.index}` === key);
      if (exists) {
        setMarkedPointMap((map) => {
          const next = { ...map };
          delete next[key];
          return next;
        });
        return prev.filter((p) => `${p.name}::${p.index}` !== key);
      }
      return [...prev, { ...point, index: idx, time: t }];
    });
  };
  const onAspPointsSelect = (points) => {
    if (!Array.isArray(points) || !points.length) return;
    setSelectedPoints((prev) => {
      const existing = new Set(prev.map((p) => `${p.name}::${p.index}`));
      const additions = points
        .map((point) => {
          const idx = Number(point?.index);
          const t = Number(point?.time);
          if (!point?.name || !Number.isInteger(idx) || idx < 0 || !Number.isFinite(t)) {
            return null;
          }
          const key = `${point.name}::${idx}`;
          if (existing.has(key)) return null;
          existing.add(key);
          return { ...point, index: idx, time: t };
        })
        .filter(Boolean);
      if (!additions.length) return prev;
      return [...prev, ...additions];
    });
  };
  const allPointsMarked =
    visibleSelectedPoints.length > 0 &&
    visibleSelectedPoints.every((p) => Boolean(markedPointMap[pointKey(p)]));

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
        </div>
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.head}`}>
            <div className={styles.cellCheckbox}>Show</div>
            <div className={styles.cellName}>Filename</div>
            <div className={styles.cellFit}>Equation (m/s²)</div>
            <div className={styles.cellMetric}>A0 (m/s²)</div>
            <div className={styles.cellMetric}>S0 (m/s)</div>
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
              <div className={styles.cellFit}>
                {item.profile?.fit
                  ? `a = ${fmt(item.profile.fit.A0)} + (${fmt(item.profile.fit.AS_slope)}) · v`
                  : "—"}
              </div>
              <div className={styles.cellMetric}>
                {item.profile?.fit ? fmt(item.profile.fit.A0) : "—"}
              </div>
              <div className={styles.cellMetric}>
                {item.profile?.fit ? fmt(item.profile.fit.S0) : "—"}
              </div>
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
          colorMap={colors}
          defaultColor={defaultColor}
          onPointSelect={onAspPointSelect}
          onPointsSelect={onAspPointsSelect}
          selectedPoints={visibleSelectedPoints}
          pointWindow={pointWindow}
        />
      )}
      {visibleResults.length > 0 && (
        <div className={styles.selectionSection}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <label className={styles.selectAll}>
                <input
                  type="checkbox"
                  checked={allPointsMarked}
                  disabled={!visibleSelectedPoints.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setMarkedPointMap((prev) => {
                        const next = { ...prev };
                        visibleSelectedPoints.forEach((p) => {
                          next[pointKey(p)] = true;
                        });
                        return next;
                      });
                      return;
                    }
                    setMarkedPointMap((prev) => {
                      const next = { ...prev };
                      visibleSelectedPoints.forEach((p) => {
                        delete next[pointKey(p)];
                      });
                      return next;
                    });
                  }}
                />
                <span>Select all</span>
              </label>
              <span className={styles.count}>
                {visibleSelectedPoints.length} points · {selectedVisibleCount} selected
              </span>
            </div>
            <div className={styles.selectionControls}>
              <label className={styles.selectionLabel}>
                +/- points
                <input
                  className={styles.selectionInput}
                  type="number"
                  min={0}
                  step={1}
                  value={pointWindow}
                  onChange={(e) => setPointWindow(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <label className={styles.selectionLabel}>
                +/- seconds
                <input
                  className={styles.selectionInput}
                  type="number"
                  min={0}
                  step={0.1}
                  value={timeWindowSec}
                  onChange={(e) => setTimeWindowSec(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <button
                className={styles.selectionDangerBtn}
                type="button"
                disabled={!selectedVisibleCount}
                onClick={() => {
                  const removeKeys = new Set(
                    visibleSelectedPoints
                      .filter((p) => markedPointMap[pointKey(p)])
                      .map(pointKey),
                  );
                  setSelectedPoints((prev) => prev.filter((p) => !removeKeys.has(pointKey(p))));
                  setMarkedPointMap((prev) => {
                    const next = { ...prev };
                    removeKeys.forEach((k) => {
                      delete next[k];
                    });
                    visibleSelectedPoints.forEach((p) => {
                      delete next[pointKey(p)];
                    });
                    return next;
                  });
                }}
              >
                Delete selected
              </button>
            </div>
          </div>
          <div className={styles.selectionTable}>
            <div
              className={`${styles.row} ${styles.head} ${styles.selectionRow} ${styles.selectionHead}`}
            >
              <div className={styles.selectionCellCheckbox}></div>
              <button
                className={`${styles.selectionSortBtn} ${styles.selectionSortBtnFixed}`}
                type="button"
                onClick={() => toggleSortRule("name")}
              >
                Filename{sortBadge("name") || " ↕"}
              </button>
              <button
                className={styles.selectionSortBtn}
                type="button"
                onClick={() => toggleSortRule("time")}
              >
                Time{sortBadge("time") || " ↕"}
              </button>
              <button
                className={styles.selectionSortBtn}
                type="button"
                onClick={() => toggleSortRule("speed")}
              >
                Speed{sortBadge("speed") || " ↕"}
              </button>
              <button
                className={styles.selectionSortBtn}
                type="button"
                onClick={() => toggleSortRule("accel")}
              >
                Accel{sortBadge("accel") || " ↕"}
              </button>
              <div className={styles.selectionActions}></div>
            </div>
            {filteredSelectedPoints.length === 0 && (
              <div className={styles.selectionEmpty}>No selected points.</div>
            )}
            {filteredSelectedPoints.map((p, i) => (
              <div
                className={`${styles.row} ${styles.selectionRow}`}
                key={`${p.name}-${p.index}-${i}`}
              >
                <div className={styles.selectionCellCheckbox}>
                  <input
                    type="checkbox"
                    checked={Boolean(markedPointMap[pointKey(p)])}
                    onChange={(e) => {
                      const key = pointKey(p);
                      setMarkedPointMap((prev) => {
                        const next = { ...prev };
                        if (e.target.checked) next[key] = true;
                        else delete next[key];
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
                      setMarkedPointMap((prev) => {
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
      )}

      {visibleResults.length > 0 && (
        <section className={styles.fileSection}>
          <div className={styles.statsCard}>
            <div className={`${styles.statsRow} ${styles.statsHead}`}>
              <span></span>
              <span>Min</span>
              <span>Mean</span>
              <span>Median</span>
              <span>Max</span>
              <span>Area</span>
            </div>
            {combinedStatsRows.map((row) => {
              const units = metricUnits(row.metric);
              return (
                <div className={styles.statsRow} key={row.label}>
                  <span className={styles.statsLabel}>{row.label}</span>
                  <span className={styles.statsValue}>{fmtWithUnit(row.values?.min, units.value)}</span>
                  <span className={styles.statsValue}>
                    {fmtWithUnit(row.values?.mean, units.value)}
                  </span>
                  <span className={styles.statsValue}>
                    {fmtWithUnit(row.values?.median, units.value)}
                  </span>
                  <span className={styles.statsValue}>{fmtWithUnit(row.values?.max, units.value)}</span>
                  <span className={styles.statsValue}>
                    {units.area ? fmtWithUnit(row.values?.area, units.area) : "-"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className={styles.timeseriesGrid}>
            <TimeSeriesChart
              title="Speed"
              series={combinedTimeseries.speedSeries}
              xTitle={xAxisTitle}
              selectedPoints={visibleSelectedPoints}
              pointWindow={pointWindow}
              timeWindowSec={timeWindowSec}
              yReferenceLines={speedReferenceLines}
            />
            <TimeSeriesChart
              title="Acceleration"
              series={combinedTimeseries.accelerationSeries}
              xTitle={xAxisTitle}
              selectedPoints={visibleSelectedPoints}
              pointWindow={pointWindow}
              timeWindowSec={timeWindowSec}
            />
            {combinedTimeseries.heartrateSeries.length > 0 && (
              <TimeSeriesChart
                title="Heartrate"
                series={combinedTimeseries.heartrateSeries}
                xTitle={xAxisTitle}
                selectedPoints={visibleSelectedPoints}
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

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

  const visibleResults = results.filter((r) => !hiddenMap[r.name]);

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
            <div className={styles.cellCheckbox}></div>
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
          title="ASP Chart"
          colorMap={colors}
          defaultColor={defaultColor}
        />
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
            />
            <TimeSeriesChart
              title="Acceleration"
              series={combinedTimeseries.accelerationSeries}
              xTitle={xAxisTitle}
            />
            {combinedTimeseries.heartrateSeries.length > 0 && (
              <TimeSeriesChart
                title="Heartrate"
                series={combinedTimeseries.heartrateSeries}
                xTitle={xAxisTitle}
              />
            )}
          </div>
        </section>
      )}
    </section>
  );
}

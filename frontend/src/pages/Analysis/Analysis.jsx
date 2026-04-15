import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { useAnalysisLayout } from "../../components/Layout/AnalysisLayoutContext";
import { getCssVar } from "../../utils/getCssVar";
import { hexToRgba } from "../../utils/hexToRgba";
import AnalysisReport from "./AnalysisReport";
import AnalysisToolbar from "./AnalysisToolbar";

import styles from "./Analysis.module.css";

export default function Analysis() {
  const location = useLocation();
  const { analysisToolsOpen: toolsOpen, setAnalysisToolsOpen: setToolsOpen } = useAnalysisLayout();

  useEffect(() => () => setToolsOpen(false), [setToolsOpen]);

  const analysisState = location.state || {};
  const results = useMemo(
    () => (Array.isArray(analysisState?.results) ? analysisState.results : []),
    [analysisState],
  );

  const [colors, setColors] = useState({});
  const savedColors = useMemo(() => analysisState?.color_map || {}, [analysisState]);
  const defaultColor = getCssVar("--red");
  const colorMap = useMemo(
    () =>
      Object.fromEntries(
        results.map((item) => [
          item.name,
          colors[item.name] || savedColors[item.name] || defaultColor,
        ]),
      ),
    [results, savedColors, colors, defaultColor],
  );
  const [hiddenMap, setHiddenMap] = useState({});
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [markedPointMap, setMarkedPointMap] = useState({});
  const [pointWindow, setPointWindow] = useState(10);
  const [timeWindowSec, setTimeWindowSec] = useState(10);
  const [pointsSortRules, setPointsSortRules] = useState([]);
  const [speedSeriesUnit, setSpeedSeriesUnit] = useState(
    () => localStorage.getItem("analysis_speed_series_unit") || "m/s",
  );
  const [timeMode, setTimeMode] = useState(() => localStorage.getItem("analysis_time_mode") || "relative");
  const visibleResults = results.filter((r) => !hiddenMap[r.name]);
  const pointKey = (p) => `${p.name}::${p.index}`;
  const visibleFileNames = new Set(visibleResults.map((r) => r.name));
  const visibleSelectedPoints = selectedPoints.filter((p) => visibleFileNames.has(p.name));
  const selectedVisibleCount = visibleSelectedPoints.filter(
    (p) => markedPointMap[pointKey(p)],
  ).length;
  const filteredSelectedPoints = useMemo(() => {
    const sorted = [...visibleSelectedPoints];
    if (!pointsSortRules.length) return sorted;

    sorted.sort((a, b) => {
      for (const rule of pointsSortRules) {
        let cmp = 0;
        if (rule.key === "name") cmp = String(a.name).localeCompare(String(b.name));
        if (rule.key === "time") cmp = Number(getPointDisplayTime(a)) - Number(getPointDisplayTime(b));
        if (rule.key === "speed") cmp = Number(a.speed) - Number(b.speed);
        if (rule.key === "accel") cmp = Number(a.accel) - Number(b.accel);
        if (cmp !== 0) return rule.dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
    return sorted;
  }, [visibleSelectedPoints, pointsSortRules, timeMode, results]);

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

  useEffect(() => {
    localStorage.setItem("analysis_time_mode", timeMode);
  }, [timeMode]);

  useEffect(() => {
    localStorage.setItem("analysis_speed_series_unit", speedSeriesUnit);
  }, [speedSeriesUnit]);

  const toKmh = (value) => Number(value) * 3.6;
  const speedSeriesFactor = speedSeriesUnit === "km/h" ? 3.6 : 1;
  const speedSeriesUnitLabel = speedSeriesUnit;
  const formatSecondsClock = (value, fractionDigits = 0) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "—";
    const totalSeconds = Number(value);
    const sign = totalSeconds < 0 ? "-" : "";
    const safeSeconds = Math.abs(totalSeconds);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secondsValue = safeSeconds % 60;
    const secondsText =
      fractionDigits > 0
        ? secondsValue.toFixed(fractionDigits).padStart(3 + fractionDigits, "0")
        : String(Math.floor(secondsValue)).padStart(2, "0");
    return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${secondsText}`;
  };
  const formatAbsoluteClock = (value, fractionDigits = 0) => {
    const raw = String(value || "").trim();
    if (!raw) return "—";
    const parts = raw.split(":");
    if (parts.length !== 3) return raw;
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const seconds = Number(parts[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      return raw;
    }
    const secondsText =
      fractionDigits > 0
        ? seconds.toFixed(fractionDigits).padStart(3 + fractionDigits, "0")
        : String(Math.floor(seconds)).padStart(2, "0");
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${secondsText}`;
  };
  const formatSpeedPair = (value) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "—";
    return `${Number(value).toFixed(3)} m/s (${toKmh(value).toFixed(3)} km/h)`;
  };
  const formatDistanceKm = (value) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "—";
    return `${(Number(value) / 1000).toFixed(3)} km`;
  };
  const fitSlopeLabel = (value) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "—";
    return `${Number(value).toFixed(3)}`;
  };
  const formatTimeSummary = (timeseries) => {
    const times = timeseries?.time;
    if (!Array.isArray(times) || times.length < 2) return "—";
    const start = Number(times[0]);
    const end = Number(times[times.length - 1]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "—";
    if (
      timeMode === "absolute" &&
      Array.isArray(timeseries?.absolute_time) &&
      timeseries.absolute_time[0] &&
      timeseries.absolute_time[timeseries.absolute_time.length - 1]
    ) {
      return `${formatAbsoluteClock(timeseries.absolute_time[0])} -> ${formatAbsoluteClock(timeseries.absolute_time[timeseries.absolute_time.length - 1])}`;
    }
    return formatSecondsClock(end - start);
  };
  const formatPointTime = (point) => {
    if (timeMode === "absolute" && point?.absoluteTime) return formatAbsoluteClock(point.absoluteTime);
    return formatSecondsClock(getPointDisplayTime(point));
  };
  const canUseAbsoluteTimeAxis =
    timeMode === "absolute" &&
    visibleResults.some(
      (item) =>
        Array.isArray(item?.profile?.timeseries?.absolute_time) &&
        item.profile.timeseries.absolute_time.length > 0,
    );
  const formatTimeAxisTick = (value, label) =>
    canUseAbsoluteTimeAxis && label ? formatAbsoluteClock(label) : formatSecondsClock(value);
  const formatTimeHoverLabel = (value, label) =>
    canUseAbsoluteTimeAxis && label
      ? formatAbsoluteClock(label, 1)
      : formatSecondsClock(value, 1);

  const getRelativeTimeAxis = (timeValues) => {
    if (!Array.isArray(timeValues) || !timeValues.length) return [];
    const first = Number(timeValues[0]);
    if (!Number.isFinite(first)) return timeValues.map((value) => Number(value));
    return timeValues.map((value) => Number(value) - first);
  };
  const getRelativePointTime = (name, rawTime) => {
    const numericTime = Number(rawTime);
    if (!Number.isFinite(numericTime)) return rawTime;
    const item = results.find((entry) => entry.name === name);
    const firstTime = Number(item?.profile?.timeseries?.time?.[0]);
    if (!Number.isFinite(firstTime)) return numericTime;
    return numericTime - firstTime;
  };
  const getPointDisplayTime = (point) => {
    const rawTime = point?.rawTime ?? point?.time;
    if (timeMode === "absolute") return rawTime;
    return getRelativePointTime(point?.name, rawTime);
  };

  const combinedTimeseries = useMemo(() => {
    const speedSeries = [];
    const accelerationSeries = [];

    visibleResults.forEach((item) => {
      const ts = item.profile?.timeseries;
      const color = colorMap[item.name];
      const seriesName = item.name;

      if (ts?.time?.length && ts.speed?.length) {
        speedSeries.push({
          name: seriesName,
          values: ts.speed.map((value) => Number(value) * speedSeriesFactor),
          color,
          x: timeMode === "absolute" ? ts.time : getRelativeTimeAxis(ts.time),
          labels: timeMode === "absolute" ? ts.absolute_time : [],
        });
      }
      if (ts?.time?.length && ts.acceleration?.length) {
        accelerationSeries.push({
          name: seriesName,
          values: ts.acceleration,
          color,
          x: timeMode === "absolute" ? ts.time : getRelativeTimeAxis(ts.time),
          labels: timeMode === "absolute" ? ts.absolute_time : [],
        });
      }
    });

    return { speedSeries, accelerationSeries };
  }, [visibleResults, colorMap, speedSeriesFactor, timeMode]);
  const xAxisTitle = canUseAbsoluteTimeAxis ? "Absolute time" : "Time from start";
  const speedReferenceLines = useMemo(
    () =>
      visibleResults
        .map((item) => ({
          y: Number(item?.profile?.meta?.min_speed) * speedSeriesFactor,
          color: colorMap[item.name],
          width: 1.5,
          dash: "dash",
        }))
        .filter((line) => Number.isFinite(line.y)),
    [visibleResults, colorMap, speedSeriesFactor],
  );

  const combinedStatsRows = useMemo(() => {
    const rows = [];
    visibleResults.forEach((item) => {
      const stats = item.profile?.stats || {};
      rows.push({
        fileName: item.name,
        metricLabel: "Speed",
        values: stats.speed,
        metric: "speed",
      });
    });
    visibleResults.forEach((item) => {
      const stats = item.profile?.stats || {};
      rows.push({
        fileName: item.name,
        metricLabel: "Acceleration",
        values: stats.acceleration,
        metric: "acceleration",
      });
    });
    return rows;
  }, [visibleResults]);

  const violinCharts = useMemo(() => {
    const buildMetricChart = ({ key, title, unit }) => {
      const sharedBand = title;
      const seriesItems = visibleResults
        .filter((item) => item.profile?.timeseries?.[key]?.length)
        .map((item) => {
          const x = item.profile.timeseries[key].map((value) => Number(value));
          const color = colorMap[item.name];
          return {
            values: x,
            trace: {
            key: item.name,
            type: "violin",
            name: item.name,
            x,
            y: new Array(x.length).fill(sharedBand),
            orientation: "h",
            side: "positive",
            box: { visible: false },
            meanline: { visible: false },
            points: false,
            hoveron: "kde",
            spanmode: "soft",
            scalemode: "width",
            line: { color },
            fillcolor: "rgba(0,0,0,0)",
            opacity: 1,
            showlegend: true,
            },
          };
        });

      const traces = seriesItems.map((item) => item.trace);
      if (!traces.length) return null;
      const maxValue = Math.max(
        0,
        ...seriesItems.flatMap((item) => item.values).filter((value) => Number.isFinite(value)),
      );
      return {
        key,
        title,
        traces,
        violinMode: "overlay",
        xAxis: {
          title: { text: unit },
          type: "linear",
          range: [0, maxValue],
        },
        yAxis: {
          title: { text: "" },
          type: "category",
          showticklabels: false,
        },
      };
    };

    return [
      buildMetricChart({ key: "acceleration", title: "Acceleration Distribution", unit: "m/s²" }),
      buildMetricChart({ key: "speed", title: "Speed Distribution", unit: "m/s" }),
    ].filter(Boolean);
  }, [visibleResults, colorMap]);

  const fmt = (v) =>
    v === undefined || v === null || Number.isNaN(v) ? "—" : Number(v).toFixed(3);
  const fmtWithUnit = (v, unit) => {
    if (v === undefined || v === null || Number.isNaN(v)) return "—";
    return `${Number(v).toFixed(3)} ${unit}`;
  };
  const metricUnits = (metric) => {
    if (metric === "speed") return { value: "m/s", area: "km" };
    if (metric === "acceleration") return { value: "m/s²", area: "m/s" };
    return { value: "", area: null };
  };
  const allShown = results.length > 0 && results.every((r) => !hiddenMap[r.name]);
  const shownCount = results.filter((r) => !hiddenMap[r.name]).length;
  const speedViolinChart = violinCharts.find((chart) => chart.key === "speed");
  const accelerationViolinChart = violinCharts.find((chart) => chart.key === "acceleration");
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
      return [
        ...prev,
        {
          ...point,
          index: idx,
          time: t,
          rawTime: t,
        },
      ];
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
          return {
            ...point,
            index: idx,
            time: t,
            rawTime: t,
          };
        })
        .filter(Boolean);
      if (!additions.length) return prev;
      return [...prev, ...additions];
    });
  };
  const allPointsMarked =
    visibleSelectedPoints.length > 0 &&
    visibleSelectedPoints.every((p) => Boolean(markedPointMap[pointKey(p)]));

  if (results.length === 0) {
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

      {toolsOpen && (
        <>
          <div className={styles.drawerBackdropOpen} onClick={() => setToolsOpen(false)} />
          <aside className={styles.toolsDrawerOpen}>
            <AnalysisToolbar
              visibleSelectedPoints={visibleSelectedPoints}
              allPointsMarked={allPointsMarked}
              markedPointMap={markedPointMap}
              setMarkedPointMap={setMarkedPointMap}
              pointKey={pointKey}
              selectedVisibleCount={selectedVisibleCount}
              pointWindow={pointWindow}
              setPointWindow={setPointWindow}
              timeWindowSec={timeWindowSec}
              setTimeWindowSec={setTimeWindowSec}
              setSelectedPoints={setSelectedPoints}
              filteredSelectedPoints={filteredSelectedPoints}
              toggleSortRule={toggleSortRule}
              sortBadge={sortBadge}
              timeMode={timeMode}
              formatSpeedPair={formatSpeedPair}
              formatPointTime={formatPointTime}
              fmt={fmt}
            />
          </aside>
        </>
      )}
      <AnalysisReport
        results={results}
        visibleResults={visibleResults}
        colorMap={colorMap}
        hiddenMap={hiddenMap}
        setHiddenMap={setHiddenMap}
        setColors={setColors}
        allShown={allShown}
        shownCount={shownCount}
        onAspPointSelect={onAspPointSelect}
        onAspPointsSelect={onAspPointsSelect}
        visibleSelectedPoints={visibleSelectedPoints}
        pointWindow={pointWindow}
        combinedStatsRows={combinedStatsRows}
        metricUnits={metricUnits}
        fmtWithUnit={fmtWithUnit}
        combinedTimeseries={combinedTimeseries}
        xAxisTitle={xAxisTitle}
        timeWindowSec={timeWindowSec}
        speedReferenceLines={speedReferenceLines}
        speedViolinChart={speedViolinChart}
        accelerationViolinChart={accelerationViolinChart}
        fmt={fmt}
        formatSpeedPair={formatSpeedPair}
        formatDistanceKm={formatDistanceKm}
        formatTimeSummary={formatTimeSummary}
        fitSlopeLabel={fitSlopeLabel}
        xTickFormatter={formatTimeAxisTick}
        xHoverFormatter={formatTimeHoverLabel}
        speedSeriesUnitLabel={speedSeriesUnitLabel}
        speedSeriesUnit={speedSeriesUnit}
        setSpeedSeriesUnit={setSpeedSeriesUnit}
        timeMode={timeMode}
        setTimeMode={setTimeMode}
      />
    </section>
  );
}

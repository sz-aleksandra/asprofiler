import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { useAnalysisLayout } from "../../components/Layout/AnalysisLayoutContext";
import { getCssVar } from "../../utils/getCssVar";
import AnalysisReport from "./AnalysisReport";
import AnalysisToolbar from "./AnalysisToolbar";

import styles from "./Analysis.module.css";

export default function Analysis() {
  const location = useLocation();
  const { analysisToolsOpen: toolsOpen, setAnalysisToolsOpen: setToolsOpen } = useAnalysisLayout();

  useEffect(() => () => setToolsOpen(false), [setToolsOpen]);

  const analysisState = location.state;
  const results = Array.isArray(analysisState?.results) ? analysisState.results : [];

  const [colors, setColors] = useState({});
  const defaultColor = getCssVar("--red");
  const colorMap = useMemo(() => {
    const nextResults = Array.isArray(analysisState?.results) ? analysisState.results : [];
    const savedColors = analysisState?.color_map || {};
    return Object.fromEntries(
      nextResults.map((item) => [
        item.name,
        colors[item.name] || savedColors[item.name] || defaultColor,
      ]),
    );
  }, [analysisState, colors, defaultColor]);
  const [hiddenMap, setHiddenMap] = useState({});
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [markedPointMap, setMarkedPointMap] = useState({});
  const [pointsBefore, setPointsBefore] = useState(10);
  const [pointsAfter, setPointsAfter] = useState(10);
  const [pointsSortRules, setPointsSortRules] = useState([]);
  const [speedSeriesUnit, setSpeedSeriesUnit] = useState(
    () => localStorage.getItem("analysis_speed_series_unit") || "m/s",
  );
  const [timeMode, setTimeMode] = useState(
    () => localStorage.getItem("analysis_time_mode") || "relative",
  );
  const [distributionScale, setDistributionScale] = useState(
    () => localStorage.getItem("analysis_distribution_scale") || "log",
  );
  const analysisParams = useMemo(() => {
    const defaults = {
      min_speed: 3,
      bin_size: 0.2,
      top_n: 2,
      confidence_level: 0.95,
    };
    try {
      const raw = localStorage.getItem("analysis_params");
      if (raw) return { ...defaults, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return defaults;
  }, []);
  const preprocessing = useMemo(() => {
    const defaults = {
      filter_window: 5,
      filter_mode: "median_mean",
      hacc_threshold: 2,
    };
    if (analysisState?.preprocessing) {
      return { ...defaults, ...analysisState.preprocessing };
    }
    try {
      const raw = localStorage.getItem("analysis_preprocessing");
      if (raw) return { ...defaults, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return defaults;
  }, [analysisState]);
  const getRelativePointTime = (name, rawTime) => {
    const numericTime = Number(rawTime);
    if (!Number.isFinite(numericTime)) return rawTime;
    const item = results.find((entry) => entry.name === name);
    const firstTime = Number(item.profile.timeseries.time[0]);
    if (!Number.isFinite(firstTime)) return numericTime;
    return numericTime - firstTime;
  };
  const getPointDisplayTime = (point) => {
    const rawTime = point?.rawTime ?? point?.time;
    if (timeMode === "absolute") return rawTime;
    return getRelativePointTime(point?.name, rawTime);
  };
  const visibleResults = results.filter((r) => !hiddenMap[r.name]);
  const pointKey = (p) => `${p.name}::${p.index}`;
  const visibleFileNames = new Set(visibleResults.map((r) => r.name));
  const visibleSelectedPoints = selectedPoints.filter((p) => visibleFileNames.has(p.name));
  const selectedVisibleCount = visibleSelectedPoints.filter(
    (p) => markedPointMap[pointKey(p)],
  ).length;
  const filteredSelectedPoints = (() => {
    const sorted = [...visibleSelectedPoints];
    if (!pointsSortRules.length) return sorted;

    sorted.sort((a, b) => {
      for (const rule of pointsSortRules) {
        let cmp = 0;
        if (rule.key === "name") cmp = String(a.name).localeCompare(String(b.name));
        if (rule.key === "time")
          cmp = Number(getPointDisplayTime(a)) - Number(getPointDisplayTime(b));
        if (rule.key === "speed") cmp = Number(a.speed) - Number(b.speed);
        if (rule.key === "accel") cmp = Number(a.accel) - Number(b.accel);
        if (cmp !== 0) return rule.dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
    return sorted;
  })();

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

  useEffect(() => {
    localStorage.setItem("analysis_distribution_scale", distributionScale);
  }, [distributionScale]);

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
  const formatPointTime = (point) => {
    if (timeMode === "absolute" && point?.absoluteTime)
      return formatAbsoluteClock(point.absoluteTime);
    return formatSecondsClock(getPointDisplayTime(point));
  };
  const formatTrajectoryTime = (seconds, absoluteTime) => {
    if (timeMode === "absolute" && absoluteTime) return formatAbsoluteClock(absoluteTime, 1);
    const value = Number(seconds);
    if (!Number.isFinite(value)) return "—";
    return formatSecondsClock(value, 1);
  };
  const canUseAbsoluteTimeAxis =
    timeMode === "absolute" &&
    visibleResults.some(
      (item) =>
        Array.isArray(item.profile.timeseries.absolute_time) &&
        item.profile.timeseries.absolute_time.length > 0,
    );
  const formatTimeAxisTick = (value, label) =>
    canUseAbsoluteTimeAxis && label ? formatAbsoluteClock(label, 1) : formatSecondsClock(value, 1);
  const formatTimeHoverLabel = (value, label) =>
    canUseAbsoluteTimeAxis && label ? formatAbsoluteClock(label, 1) : formatSecondsClock(value, 1);

  const getRelativeTimeAxis = (timeValues) => {
    if (!Array.isArray(timeValues) || !timeValues.length) return [];
    const first = Number(timeValues[0]);
    if (!Number.isFinite(first)) return timeValues.map((value) => Number(value));
    return timeValues.map((value) => Number(value) - first);
  };

  const combinedTimeseries = (() => {
    const speedSeries = [];
    const accelerationSeries = [];

    visibleResults.forEach((item) => {
      const ts = item.profile.timeseries;
      const color = colorMap[item.name];
      const seriesName = item.name;

      if (ts.time.length && ts.speed.length) {
        speedSeries.push({
          name: seriesName,
          values: ts.speed.map((value) => Number(value) * speedSeriesFactor),
          color,
          x: timeMode === "absolute" ? ts.time : getRelativeTimeAxis(ts.time),
          labels: timeMode === "absolute" ? ts.absolute_time : [],
        });
      }
      if (ts.time.length && ts.acceleration.length) {
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
  })();
  const xAxisTitle = canUseAbsoluteTimeAxis ? "Absolute time" : "Time from start";
  const speedReferenceLines = visibleResults
    .map((item) => ({
      y: Number(item?.profile?.meta?.min_speed) * speedSeriesFactor,
      color: colorMap[item.name],
      width: 1.5,
      dash: "dash",
    }))
    .filter((line) => Number.isFinite(line.y));

  const combinedStatsRows = (() => {
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
    visibleResults.forEach((item) => {
      const stats = item.profile?.stats || {};
      rows.push({
        fileName: item.name,
        metricLabel: "Deceleration",
        values: stats.deceleration,
        metric: "deceleration",
      });
    });
    return rows;
  })();

  const accelerationAspProfiles = useMemo(
    () =>
      visibleResults
        .map((item) => {
          const profile = item.profile?.acceleration_profile;
          return profile
            ? {
                name: item.name,
                profile,
                timeseries: item.profile.timeseries,
              }
            : null;
        })
        .filter(Boolean),
    [visibleResults],
  );

  const decelerationAspProfiles = useMemo(
    () =>
      visibleResults
        .map((item) => {
          const profile = item.profile?.deceleration_profile;
          return profile
            ? {
                name: item.name,
                profile,
                timeseries: item.profile.timeseries,
              }
            : null;
        })
        .filter(Boolean),
    [visibleResults],
  );

  const distributionCharts = (() => {
    const getMetricValues = (values, filterValue = () => true, mapValue = (value) => value) =>
      values.filter(filterValue).map(mapValue);

    const buildBinTrace = (item, values, minValue, xAxisRangeEnd, title, unit) => {
      const binMap = new Map();

      values.forEach((value) => {
        const clampedValue = Math.min(value, xAxisRangeEnd);
        const binStart = minValue + Math.floor((clampedValue - minValue) / 1) * 1;
        const keyName = String(binStart);
        const count = binMap.get(keyName) || 0;
        binMap.set(keyName, count + 1);
      });

      const x = [];
      const y = [];
      const customdata = [];
      for (let binStart = minValue; binStart < xAxisRangeEnd; binStart += 1) {
        x.push(binStart + 0.5);
        y.push(binMap.get(String(binStart)) || 0);
        customdata.push([binStart, binStart + 1]);
      }

      return {
        key: item.name,
        type: "bar",
        name: item.name,
        x,
        y,
        customdata,
        width: 1,
        marker: { color: colorMap[item.name] },
        hovertemplate:
          `${item.name}<br>${title}: %{customdata[0]:.0f} to %{customdata[1]:.0f} ${unit}` +
          `<br>Count: %{y}<extra></extra>`,
        showlegend: true,
      };
    };

    const buildMetricChart = ({
      key,
      title,
      unit,
      filterValue = () => true,
      mapValue = (value) => value,
    }) => {
      const allValues = visibleResults.flatMap((item) =>
        getMetricValues(item.profile.timeseries[key], filterValue, mapValue),
      );
      const minValue = allValues.length ? Math.floor(Math.min(...allValues)) : 0;
      const maxValue = allValues.length ? Math.ceil(Math.max(...allValues)) : 0;
      const xAxisRangeEnd = Math.max(1, maxValue);
      const traces = visibleResults
        .map((item) => {
          const values = getMetricValues(item.profile.timeseries[key], filterValue, mapValue);
          if (!values.length) return null;
          return buildBinTrace(item, values, minValue, xAxisRangeEnd, title, unit);
        })
        .filter(Boolean);

      if (!traces.length) return null;
      return {
        key,
        title,
        traces,
          barMode: "overlay",
          xAxis: {
            title: { text: unit },
            type: "linear",
            range: [minValue, xAxisRangeEnd],
          },
          yAxis: {
            title: { text: "Count" },
            type: distributionScale === "log" ? "log" : "linear",
            rangemode: "tozero",
        },
      };
    };

    return [
      buildMetricChart({
        key: "acceleration",
        title: "Acceleration Distribution",
        unit: "m/s²",
        filterValue: (value) => value > 0,
      }),
      buildMetricChart({
        key: "acceleration",
        title: "Deceleration Distribution",
        unit: "m/s²",
        filterValue: (value) => value < 0,
        mapValue: (value) => Math.abs(value),
      }),
      buildMetricChart({ key: "speed", title: "Speed Distribution", unit: "m/s" }),
    ].filter(Boolean);
  })();

  const fmt = (v) =>
    v === undefined || v === null || Number.isNaN(v) ? "—" : Number(v).toFixed(3);
  const fmtWithUnit = (v, unit) => {
    if (v === undefined || v === null || Number.isNaN(v)) return "—";
    return `${Number(v).toFixed(3)} ${unit}`;
  };
  const metricUnits = (metric) => {
    if (metric === "speed") return { value: "m/s", area: "km" };
    if (metric === "acceleration") return { value: "m/s²", area: "m/s" };
    if (metric === "deceleration") return { value: "m/s²", area: "m/s" };
    return { value: "", area: null };
  };
  const allShown = results.length > 0 && results.every((r) => !hiddenMap[r.name]);
  const shownCount = results.filter((r) => !hiddenMap[r.name]).length;
  const speedDistributionChart = distributionCharts.find((chart) => chart.key === "speed");
  const accelerationDistributionChart = distributionCharts.find(
    (chart) => chart.key === "acceleration" && chart.title === "Acceleration Distribution",
  );
  const decelerationDistributionChart = distributionCharts.find(
    (chart) => chart.key === "acceleration" && chart.title === "Deceleration Distribution",
  );
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
              pointsBefore={pointsBefore}
              setPointsBefore={setPointsBefore}
              pointsAfter={pointsAfter}
              setPointsAfter={setPointsAfter}
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
        accelerationAspProfiles={accelerationAspProfiles}
        decelerationAspProfiles={decelerationAspProfiles}
        onAspPointSelect={onAspPointSelect}
        onAspPointsSelect={onAspPointsSelect}
        visibleSelectedPoints={visibleSelectedPoints}
        pointsBefore={pointsBefore}
        pointsAfter={pointsAfter}
        combinedStatsRows={combinedStatsRows}
        metricUnits={metricUnits}
        fmtWithUnit={fmtWithUnit}
        combinedTimeseries={combinedTimeseries}
        xAxisTitle={xAxisTitle}
        speedReferenceLines={speedReferenceLines}
        speedDistributionChart={speedDistributionChart}
        accelerationDistributionChart={accelerationDistributionChart}
        decelerationDistributionChart={decelerationDistributionChart}
        fmt={fmt}
        formatSpeedPair={formatSpeedPair}
        formatDistanceKm={formatDistanceKm}
        fitSlopeLabel={fitSlopeLabel}
        xTickFormatter={formatTimeAxisTick}
        xHoverFormatter={formatTimeHoverLabel}
        formatTrajectoryTime={formatTrajectoryTime}
        speedSeriesUnitLabel={speedSeriesUnitLabel}
        speedSeriesUnit={speedSeriesUnit}
        setSpeedSeriesUnit={setSpeedSeriesUnit}
        timeMode={timeMode}
        setTimeMode={setTimeMode}
        distributionScale={distributionScale}
        setDistributionScale={setDistributionScale}
        preprocessing={preprocessing}
        analysisParams={analysisParams}
      />
    </section>
  );
}

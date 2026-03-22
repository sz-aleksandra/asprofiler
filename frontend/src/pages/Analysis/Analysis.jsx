import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { useAnalysisLayout } from "../../components/Layout/AnalysisLayoutContext";
import { getAnalysis } from "../../services/filesApi";
import { getCssVar } from "../../utils/getCssVar";
import { hexToRgba } from "../../utils/hexToRgba";
import AnalysisReport from "./AnalysisReport";
import AnalysisToolbar from "./AnalysisToolbar";

import styles from "./Analysis.module.css";

export default function Analysis() {
  const { analysisId } = useParams();
  const { analysisToolsOpen: toolsOpen, setAnalysisToolsOpen: setToolsOpen } = useAnalysisLayout();

  const [fetchedAnalysis, setFetchedAnalysis] = useState(null);

  useEffect(() => {
    if (!analysisId) return undefined;

    getAnalysis(analysisId)
      .then((payload) => {
        setFetchedAnalysis(payload || {});
      })
      .catch(() => {
        setFetchedAnalysis({ results: [] });
      });
  }, [analysisId]);

  useEffect(() => () => setToolsOpen(false), [setToolsOpen]);

  const results = useMemo(
    () => (Array.isArray(fetchedAnalysis?.results) ? fetchedAnalysis.results : []),
    [fetchedAnalysis],
  );
  const loadingAnalysis = Boolean(analysisId) && fetchedAnalysis === null;

  const [colors, setColors] = useState({});
  const savedColors = useMemo(() => fetchedAnalysis?.color_map || {}, [fetchedAnalysis]);
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
      const ts = item.profile?.timeseries;
      const color = colorMap[item.name];
      const seriesName = item.name;

      if (ts?.time?.length && ts.speed?.length) {
        speedSeries.push({ name: seriesName, values: ts.speed, color, x: ts.time });
      }
      if (ts?.time?.length && ts.acceleration?.length) {
        accelerationSeries.push({
          name: seriesName,
          values: ts.acceleration,
          color,
          x: ts.time,
        });
      }
      if (ts?.time?.length && ts.heartrate?.length) {
        heartrateSeries.push({ name: seriesName, values: ts.heartrate, color, x: ts.time });
      }
    });

    return { speedSeries, accelerationSeries, heartrateSeries };
  }, [visibleResults, colorMap]);
  const speedReferenceLines = useMemo(
    () =>
      visibleResults
        .map((item) => ({
          y: Number(item?.profile?.meta?.min_speed),
          color: colorMap[item.name],
          width: 1.5,
          dash: "dash",
        }))
        .filter((line) => Number.isFinite(line.y)),
    [visibleResults, colorMap],
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
    visibleResults.forEach((item) => {
      const stats = item.profile?.stats || {};
      if (stats.heartrate) {
        rows.push({
          fileName: item.name,
          metricLabel: "Heartrate",
          values: stats.heartrate,
          metric: "heartrate",
        });
      }
    });
    return rows;
  }, [visibleResults]);

  const violinCharts = useMemo(() => {
    const buildMetricChart = ({ key, title, unit }) => {
      const traces = visibleResults
        .filter((item) => item.profile?.timeseries?.[key]?.length)
        .map((item) => {
          const y = item.profile.timeseries[key].map((value) => Number(value));
          const color = colorMap[item.name];
          return {
            key: item.name,
            type: "violin",
            name: item.name,
            x: new Array(y.length).fill(item.name),
            y,
            box: { visible: true },
            meanline: { visible: true },
            points: false,
            spanmode: "soft",
            scalemode: "width",
            line: { color },
            fillcolor: hexToRgba(color, 0.4),
            opacity: 0.9,
            showlegend: false,
          };
        });

      if (!traces.length) return null;
      return {
        key,
        title,
        traces,
        violinMode: true,
        xAxis: {
          title: { text: "File" },
          type: "category",
        },
        yAxis: {
          title: { text: unit },
        },
      };
    };

    return [
      buildMetricChart({ key: "acceleration", title: "Acceleration Distribution", unit: "m/s²" }),
      buildMetricChart({ key: "speed", title: "Speed Distribution", unit: "m/s" }),
      buildMetricChart({ key: "heartrate", title: "Heartrate Distribution", unit: "bpm" }),
    ].filter(Boolean);
  }, [visibleResults, colorMap]);

  const avHeatmaps = useMemo(() => {
    const getFilteredPoints = (item) => item.profile?.all_points_filtered || [];
    const allPoints = visibleResults.flatMap((item) => getFilteredPoints(item));
    const allSpeed = allPoints.map((point) => Number(point.speed));
    const allAccel = allPoints.map((point) => Number(point.accel));

    if (!allSpeed.length || !allAccel.length) return [];

    const minSpeed = Math.min(...allSpeed);
    const maxSpeed = Math.max(...allSpeed);
    const minAccel = Math.min(...allAccel);
    const maxAccel = Math.max(...allAccel);
    const binCount = 10;
    const safeSpeedBinSize = Math.max((maxSpeed - minSpeed) / binCount, 0.1);
    const safeAccelBinSize = Math.max((maxAccel - minAccel) / binCount, 0.05);

    const getBinIndex = (value, start, size, count) => {
      if (value <= start) return 0;
      const raw = Math.floor((value - start) / size);
      if (raw >= count) return count - 1;
      return raw;
    };

    const maxBinCount = visibleResults.reduce((globalMax, item) => {
      const bins = new Map();
      getFilteredPoints(item).forEach((point) => {
        const sx = Number(point.speed);
        const ay = Number(point.accel);
        const xBin = getBinIndex(sx, minSpeed, safeSpeedBinSize, binCount);
        const yBin = getBinIndex(ay, minAccel, safeAccelBinSize, binCount);
        const key = `${xBin}:${yBin}`;
        bins.set(key, (bins.get(key) || 0) + 1);
      });

      const localMax = bins.size ? Math.max(...bins.values()) : 0;
      return Math.max(globalMax, localMax);
    }, 0);

    return visibleResults
      .map((item) => {
        const counts = Array.from({ length: binCount }, () => Array(binCount).fill(0));

        getFilteredPoints(item).forEach((point) => {
          const sx = Number(point.speed);
          const ay = Number(point.accel);
          const xBin = getBinIndex(sx, minSpeed, safeSpeedBinSize, binCount);
          const yBin = getBinIndex(ay, minAccel, safeAccelBinSize, binCount);
          counts[yBin][xBin] += 1;
        });

        const flatCounts = counts.flat();
        if (!flatCounts.some((value) => value > 0)) return null;

        const x = Array.from(
          { length: binCount },
          (_, idx) => minSpeed + safeSpeedBinSize * idx + safeSpeedBinSize / 2,
        );
        const y = Array.from(
          { length: binCount },
          (_, idx) => minAccel + safeAccelBinSize * idx + safeAccelBinSize / 2,
        );

        return {
          key: item.name,
          title: `${item.name} Acceleration vs Speed`,
          traces: [
            {
              type: "heatmap",
              x,
              y,
              z: counts,
              showscale: true,
              coloraxis: "coloraxis",
              zmin: 0,
              zmax: maxBinCount,
              xgap: 1,
              ygap: 1,
              hovertemplate:
                "Speed bin center: %{x:.3f} m/s<br>Acceleration bin center: %{y:.3f} m/s²<br>Count: %{z}<extra></extra>",
            },
          ],
          showLegend: false,
          xAxis: {
            title: { text: "Speed (m/s)" },
            type: "linear",
            range: [minSpeed, maxSpeed],
          },
          yAxis: {
            title: { text: "Acceleration (m/s²)" },
            type: "linear",
            range: [minAccel, maxAccel],
          },
        };
      })
      .filter(Boolean);
  }, [visibleResults, colorMap]);

  const fmt = (v) =>
    v === undefined || v === null || Number.isNaN(v) ? "—" : Number(v).toFixed(3);
  const fmtWithUnit = (v, unit) => {
    if (v === undefined || v === null || Number.isNaN(v)) return "—";
    return `${Number(v).toFixed(3)} ${unit}`;
  };
  const metricUnits = (metric) => {
    if (metric === "speed") return { value: "m/s", area: "m" };
    if (metric === "acceleration") return { value: "m/s²", area: null };
    if (metric === "heartrate") return { value: "bpm", area: null };
    return { value: "", area: null };
  };
  const xAxisTitle = "Time from start (s)";
  const allShown = results.length > 0 && results.every((r) => !hiddenMap[r.name]);
  const shownCount = results.filter((r) => !hiddenMap[r.name]).length;
  const speedViolinChart = violinCharts.find((chart) => chart.key === "speed");
  const accelerationViolinChart = violinCharts.find((chart) => chart.key === "acceleration");
  const heartrateViolinChart = violinCharts.find((chart) => chart.key === "heartrate");
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

  if (loadingAnalysis) {
    return (
      <section className={styles.page}>
        <h1 className={styles.title}>Analysis</h1>
        <p>Loading analysis...</p>
      </section>
    );
  }

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
              results={results}
              allShown={allShown}
              shownCount={shownCount}
              hiddenMap={hiddenMap}
              setHiddenMap={setHiddenMap}
              colorMap={colorMap}
              colors={colors}
              setColors={setColors}
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
            />
          </aside>
        </>
      )}
      <AnalysisReport
        results={results}
        visibleResults={visibleResults}
        colorMap={colorMap}
        onAspPointSelect={onAspPointSelect}
        onAspPointsSelect={onAspPointsSelect}
        visibleSelectedPoints={visibleSelectedPoints}
        pointWindow={pointWindow}
        avHeatmaps={avHeatmaps}
        combinedStatsRows={combinedStatsRows}
        metricUnits={metricUnits}
        fmtWithUnit={fmtWithUnit}
        combinedTimeseries={combinedTimeseries}
        xAxisTitle={xAxisTitle}
        timeWindowSec={timeWindowSec}
        speedReferenceLines={speedReferenceLines}
        speedViolinChart={speedViolinChart}
        accelerationViolinChart={accelerationViolinChart}
        heartrateViolinChart={heartrateViolinChart}
        fmt={fmt}
      />
    </section>
  );
}

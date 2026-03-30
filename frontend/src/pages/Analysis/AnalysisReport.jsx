import { memo } from "react";

import AspChart from "../../components/AspChart/AspChart";
import DistributionChart from "../../components/DistributionChart/DistributionChart";
import TimeSeriesChart from "../../components/TimeSeriesChart/TimeSeriesChart";
import { hexToRgba } from "../../utils/hexToRgba";
import styles from "./Analysis.module.css";

function AnalysisReport({
  results,
  visibleResults,
  colorMap,
  onAspPointSelect,
  onAspPointsSelect,
  visibleSelectedPoints,
  pointWindow,
  avHeatmaps,
  combinedStatsRows,
  metricUnits,
  fmtWithUnit,
  combinedTimeseries,
  xAxisTitle,
  timeWindowSec,
  speedReferenceLines,
  speedViolinChart,
  accelerationViolinChart,
  fmt,
}) {
  if (visibleResults.length === 0) {
    return <div className={styles.empty}>All series hidden. Use “Show”.</div>;
  }

  const fmtDuration = (times) => {
    if (!Array.isArray(times) || times.length < 2) return "—";
    const start = Number(times[0]);
    const end = Number(times[times.length - 1]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "—";
    const totalSeconds = Math.round(end - start);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <>
      <div className={styles.reportTable}>
        <div className={`${styles.reportRow} ${styles.head}`}>
          <div className={styles.reportCellName}>Filename</div>
          <div className={styles.reportCellMetric}>Duration (hh:mm:ss)</div>
          <div className={styles.reportCellModel}>Model</div>
          <div className={styles.reportCellFit}>ASP Equation</div>
          <div className={styles.reportCellMetric}>A0 (m/s²)</div>
          <div className={styles.reportCellMetric}>S0 (m/s)</div>
        </div>
        {results.map((item) => (
          <div
            className={styles.reportRow}
            key={item.name}
            style={{ background: hexToRgba(colorMap[item.name], 0.1) }}
          >
            <div className={styles.reportCellName}>{item.name}</div>
            <div className={styles.reportCellMetric}>
              {fmtDuration(item.profile?.timeseries?.time)}
            </div>
            <div className={styles.reportCellModel}>{item.profile?.fit?.label || "Linear regression"}</div>
            <div className={styles.reportCellFit}>
              {item.profile?.fit?.A0 != null && item.profile?.fit?.AS_slope != null
                ? `a = ${fmt(item.profile.fit.A0)} + (${fmt(item.profile.fit.AS_slope)}) · v`
                : "—"}
            </div>
            <div className={styles.reportCellMetric}>
              {item.profile?.fit?.A0 != null ? fmt(item.profile.fit.A0) : "—"}
            </div>
            <div className={styles.reportCellMetric}>
              {item.profile?.fit?.S0 != null ? fmt(item.profile.fit.S0) : "—"}
            </div>
          </div>
        ))}
      </div>

      <AspChart
        profiles={visibleResults}
        colorMap={colorMap}
        onPointSelect={onAspPointSelect}
        onPointsSelect={onAspPointsSelect}
        selectedPoints={visibleSelectedPoints}
        pointWindow={pointWindow}
      />

      <section className={styles.fileSection}>
        {avHeatmaps.length > 0 && (
          <div className={styles.timeseriesGrid}>
            {avHeatmaps.map((chart) => (
              <DistributionChart
                key={chart.key}
                title={chart.title}
                traces={chart.traces}
                showLegend={chart.showLegend}
                xAxis={chart.xAxis}
                yAxis={chart.yAxis}
              />
            ))}
          </div>
        )}

        <div className={styles.statsCard}>
          <div className={`${styles.statsRow} ${styles.statsHead}`}>
            <span></span>
            <span>Min</span>
            <span>Mean</span>
            <span>Median</span>
            <span>Max</span>
            <span className={styles.statsHeadWithHelp}>
              <span>Area</span>
              <span className={styles.helpIcon} tabIndex={0}>
                ?
                <span className={styles.helpTooltip}>
                  <span>Speed area = total distance.</span>
                  <span>Acceleration area = player load (sum of acceleration changes).</span>
                </span>
              </span>
            </span>
          </div>
          {combinedStatsRows.map((row) => {
            const units = metricUnits(row.metric);
            return (
              <div
                className={styles.statsRow}
                key={`${row.fileName}-${row.metric}`}
                style={{ background: hexToRgba(colorMap[row.fileName], 0.1) }}
              >
                <span className={styles.statsLabel}>
                  <span className={styles.statsFileName}>{row.fileName} </span>
                  <span className={styles.statsMetricName}>{row.metricLabel}</span>
                </span>
                <span className={styles.statsValue}>{fmtWithUnit(row.values?.min, units.value)}</span>
                <span className={styles.statsValue}>{fmtWithUnit(row.values?.mean, units.value)}</span>
                <span className={styles.statsValue}>{fmtWithUnit(row.values?.median, units.value)}</span>
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
          {speedViolinChart && (
            <DistributionChart
              key={speedViolinChart.key}
              title={speedViolinChart.title}
              traces={speedViolinChart.traces}
              violinMode={speedViolinChart.violinMode}
              xAxis={speedViolinChart.xAxis}
              yAxis={speedViolinChart.yAxis}
            />
          )}
        </div>

        <div className={styles.timeseriesGrid}>
          <TimeSeriesChart
            title="Acceleration"
            series={combinedTimeseries.accelerationSeries}
            xTitle={xAxisTitle}
            selectedPoints={visibleSelectedPoints}
            pointWindow={pointWindow}
            timeWindowSec={timeWindowSec}
          />
          {accelerationViolinChart && (
            <DistributionChart
              key={accelerationViolinChart.key}
              title={accelerationViolinChart.title}
              traces={accelerationViolinChart.traces}
              violinMode={accelerationViolinChart.violinMode}
              xAxis={accelerationViolinChart.xAxis}
              yAxis={accelerationViolinChart.yAxis}
            />
          )}
        </div>
      </section>
    </>
  );
}

export default memo(AnalysisReport);

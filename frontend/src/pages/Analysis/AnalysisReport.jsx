import { memo } from "react";

import AspChart from "../../components/AspChart/AspChart";
import DistributionChart from "../../components/DistributionChart/DistributionChart";
import TimeSeriesChart from "../../components/TimeSeriesChart/TimeSeriesChart";
import TrajectoryChart from "../../components/TrajectoryChart/TrajectoryChart";
import { hexToRgba } from "../../utils/hexToRgba";
import styles from "./Analysis.module.css";

function AnalysisReport({
  results,
  visibleResults,
  colorMap,
  hiddenMap,
  setHiddenMap,
  setColors,
  allShown,
  shownCount,
  accelerationAspProfiles,
  decelerationAspProfiles,
  onAspPointSelect,
  onAspPointsSelect,
  visibleSelectedPoints,
  pointsBefore,
  pointsAfter,
  combinedStatsRows,
  metricUnits,
  fmtWithUnit,
  combinedTimeseries,
  xAxisTitle,
  speedReferenceLines,
  speedDistributionChart,
  accelerationDistributionChart,
  decelerationDistributionChart,
  fmt,
  formatSpeedPair,
  formatDistanceKm,
  fitSlopeLabel,
  xTickFormatter,
  xHoverFormatter,
  formatTrajectoryTime,
  speedSeriesUnitLabel,
  speedSeriesUnit,
  setSpeedSeriesUnit,
  timeMode,
  setTimeMode,
  distributionScale,
  setDistributionScale,
  preprocessing,
  analysisParams,
}) {
  const reportAspRows = [
    ...results.map((item) => ({
      key: `${item.name}-acceleration`,
      fileName: item.name,
      profileLabel: "Acceleration",
      fit: item.profile?.acceleration_profile?.fit || null,
      plotMultiplier: 1,
      color: colorMap[item.name],
      hidden: hiddenMap[item.name],
    })),
    ...results.map((item) => ({
      key: `${item.name}-deceleration`,
      fileName: item.name,
      profileLabel: "Deceleration",
      fit: item.profile?.deceleration_profile?.fit || null,
      plotMultiplier: -1,
      color: colorMap[item.name],
      hidden: hiddenMap[item.name],
    })),
  ];

  return (
    <>
      <div className={`${styles.timeseriesGrid} ${styles.timeseriesGridCompact}`}>
        <div className={styles.parameterSection}>
          <div className={`${styles.sectionTitle} ${styles.parameterSectionTitle}`}>Filtering parameters</div>
          <div className={styles.selectionControls}>
            <label className={styles.selectionLabel}>
              Filter type
              <select className={styles.selectionSelect} value={preprocessing.filter_mode} disabled>
                <option value="none">None</option>
                <option value="median">Median</option>
                <option value="mean">Mean</option>
                  <option value="median_mean">Median → Mean</option>
              </select>
            </label>
            <label className={styles.selectionLabel}>
              Filter window
              <input
                className={styles.selectionInput}
                type="number"
                value={preprocessing.filter_window}
                disabled
              />
            </label>
            <label className={styles.selectionLabel}>
              <span className={styles.statsHeadWithHelp}>
                <span>Hacc threshold (m)</span>
                <span className={styles.helpIcon} tabIndex={0}>
                  ?
                  <span className={styles.helpTooltip}>
                    <span>Horizontal accuracy = estimated horizontal position error in meters.</span>
                  </span>
                </span>
              </span>
              <input
                className={styles.selectionInput}
                type="number"
                value={preprocessing.hacc_threshold}
                disabled
              />
            </label>
          </div>
        </div>
        <div className={styles.parameterSection}>
          <div className={`${styles.sectionTitle} ${styles.parameterSectionTitle}`}>Analysis preset</div>
          <div className={styles.selectionControls}>
            <label className={styles.selectionLabel}>
              Min speed (m/s)
              <input
                className={styles.selectionInput}
                type="number"
                value={analysisParams.min_speed}
                disabled
              />
            </label>
            <label className={styles.selectionLabel}>
              Bin size (m/s)
              <input
                className={styles.selectionInput}
                type="number"
                value={analysisParams.bin_size}
                disabled
              />
            </label>
            <label className={styles.selectionLabel}>
              Top points per bin
              <input
                className={styles.selectionInput}
                type="number"
                value={analysisParams.top_n}
                disabled
              />
            </label>
            <label className={styles.selectionLabel}>
              Confidence level
              <input
                className={styles.selectionInput}
                type="number"
                value={analysisParams.confidence_level}
                disabled
              />
            </label>
          </div>
        </div>
      </div>
      <div className={styles.reportTable}>
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
        <div className={`${styles.reportRow} ${styles.head}`}>
          <div className={styles.reportCellToggle}></div>
          <div className={styles.reportCellName}>Filename</div>
          <div className={styles.reportCellMetric}>Profile</div>
          <div className={styles.reportCellFit}>ASP Equation</div>
          <div className={styles.reportCellMetric}>A0 (m/s²)</div>
          <div className={styles.reportCellMetric}>S0</div>
          <div className={styles.reportCellColor}>Color</div>
        </div>
        {reportAspRows.map((row) => {
          const displayA0 =
            row.fit?.A0 != null ? Number(row.fit.A0) * row.plotMultiplier : null;
          const displaySlope =
            row.fit?.AS_slope != null ? Number(row.fit.AS_slope) * row.plotMultiplier : null;
          return (
            <div
              className={styles.reportRow}
              key={row.key}
              style={{ background: hexToRgba(row.color, 0.1) }}
            >
              <div className={styles.reportCellToggle}>
                <input
                  type="checkbox"
                  checked={!row.hidden}
                  onChange={(e) => {
                    setHiddenMap((prev) => ({
                      ...prev,
                      [row.fileName]: !e.target.checked,
                    }));
                  }}
                />
              </div>
              <div className={styles.reportCellName}>{row.fileName}</div>
              <div className={styles.reportCellMetric}>{row.profileLabel}</div>
              <div className={styles.reportCellFit}>
                {displayA0 != null && displaySlope != null
                  ? `a = ${fmt(displayA0)} + (${fitSlopeLabel(displaySlope)}) · v`
                  : "—"}
              </div>
              <div className={styles.reportCellMetric}>
                {displayA0 != null ? fmt(displayA0) : "—"}
              </div>
              <div className={styles.reportCellMetric}>
                {row.fit?.S0 != null ? formatSpeedPair(row.fit.S0) : "—"}
              </div>
              <div className={styles.reportCellColor}>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={row.color}
                  onChange={(e) => {
                    setColors((prev) => ({ ...prev, [row.fileName]: e.target.value }));
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {visibleResults.length === 0 ? (
        <div className={styles.empty}>All series hidden. Use “Show”.</div>
      ) : (
        <>
        <AspChart
          profiles={accelerationAspProfiles}
          title="Acceleration Speed Profile"
          yAxisTitle="Acceleration (m/s²)"
          plotMultiplier={1}
          colorMap={colorMap}
          onPointSelect={onAspPointSelect}
          onPointsSelect={onAspPointsSelect}
          selectedPoints={visibleSelectedPoints}
          pointsBefore={pointsBefore}
          pointsAfter={pointsAfter}
        />

        <AspChart
          profiles={decelerationAspProfiles}
          title="Deceleration Speed Profile"
          yAxisTitle="Deceleration (m/s²)"
          plotMultiplier={-1}
          colorMap={colorMap}
          onPointSelect={onAspPointSelect}
          onPointsSelect={onAspPointsSelect}
          selectedPoints={visibleSelectedPoints}
          pointsBefore={pointsBefore}
          pointsAfter={pointsAfter}
        />

      <section className={styles.fileSection}>
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
                  <span>Acceleration area = integral of absolute acceleration over time.</span>
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
                <span className={styles.statsValue}>
                  {row.metric === "speed" ? formatSpeedPair(row.values?.min) : fmtWithUnit(row.values?.min, units.value)}
                </span>
                <span className={styles.statsValue}>
                  {row.metric === "speed" ? formatSpeedPair(row.values?.mean) : fmtWithUnit(row.values?.mean, units.value)}
                </span>
                <span className={styles.statsValue}>
                  {row.metric === "speed" ? formatSpeedPair(row.values?.median) : fmtWithUnit(row.values?.median, units.value)}
                </span>
                <span className={styles.statsValue}>
                  {row.metric === "speed" ? formatSpeedPair(row.values?.max) : fmtWithUnit(row.values?.max, units.value)}
                </span>
                <span className={styles.statsValue}>
                  {row.metric === "speed" ? formatDistanceKm(row.values?.area) : units.area ? fmtWithUnit(row.values?.area, units.area) : "-"}
                </span>
              </div>
            );
          })}
        </div>

        <div className={`${styles.timeseriesGrid} ${styles.timeseriesGridCompact}`}>
          <div className={`${styles.toolbar} ${styles.toolbarNoBorder}`}>
            <div className={styles.selectionControls}>
              <label className={styles.selectionLabel}>
                Speed chart unit
                <select
                  className={styles.selectionSelect}
                  value={speedSeriesUnit}
                  onChange={(e) => setSpeedSeriesUnit(e.target.value)}
                >
                  <option value="m/s">m/s</option>
                  <option value="km/h">km/h</option>
                </select>
              </label>
              <label className={styles.selectionLabel}>
                Time display mode
                <select
                  className={styles.selectionSelect}
                  value={timeMode}
                  onChange={(e) => setTimeMode(e.target.value)}
                >
                  <option value="relative">Relative</option>
                  <option value="absolute">Absolute</option>
                </select>
              </label>
            </div>
          </div>
          <TimeSeriesChart
            title="Speed"
            yTitle={`Speed (${speedSeriesUnitLabel})`}
            series={combinedTimeseries.speedSeries}
            xTitle={xAxisTitle}
            xIncludeZero={xAxisTitle === "Time from start"}
            xTickFormatter={xTickFormatter}
            xHoverFormatter={xHoverFormatter}
            selectedPoints={visibleSelectedPoints}
            pointsBefore={pointsBefore}
            pointsAfter={pointsAfter}
            yReferenceLines={speedReferenceLines}
          />
        </div>

        <div className={styles.timeseriesGrid}>
          <TimeSeriesChart
            title="Acceleration"
            series={combinedTimeseries.accelerationSeries}
            xTitle={xAxisTitle}
            xIncludeZero={xAxisTitle === "Time from start"}
            xTickFormatter={xTickFormatter}
            xHoverFormatter={xHoverFormatter}
            selectedPoints={visibleSelectedPoints}
            pointsBefore={pointsBefore}
            pointsAfter={pointsAfter}
          />
        </div>

        <div className={`${styles.timeseriesGrid} ${styles.timeseriesGridCompact}`}>
          <div className={`${styles.toolbar} ${styles.toolbarNoBorder}`}>
            <div className={styles.selectionControls}>
              <label className={styles.selectionLabel}>
                Distribution scale
                <select
                  className={styles.selectionSelect}
                  value={distributionScale}
                  onChange={(e) => setDistributionScale(e.target.value)}
                >
                  <option value="linear">Linear</option>
                    <option value="log">Log</option>
                </select>
              </label>
            </div>
          </div>
          {speedDistributionChart && (
            <DistributionChart
              key={speedDistributionChart.key}
              title={speedDistributionChart.title}
              traces={speedDistributionChart.traces}
              barMode={speedDistributionChart.barMode}
              xAxis={speedDistributionChart.xAxis}
              yAxis={speedDistributionChart.yAxis}
            />
          )}
          {accelerationDistributionChart && (
            <DistributionChart
              key={accelerationDistributionChart.key}
              title={accelerationDistributionChart.title}
              traces={accelerationDistributionChart.traces}
              barMode={accelerationDistributionChart.barMode}
              xAxis={accelerationDistributionChart.xAxis}
              yAxis={accelerationDistributionChart.yAxis}
            />
          )}
          {decelerationDistributionChart && (
            <DistributionChart
              key={decelerationDistributionChart.title}
              title={decelerationDistributionChart.title}
              traces={decelerationDistributionChart.traces}
              barMode={decelerationDistributionChart.barMode}
              xAxis={decelerationDistributionChart.xAxis}
              yAxis={decelerationDistributionChart.yAxis}
            />
          )}
        </div>

        {visibleResults.some(
          (item) =>
            Array.isArray(item?.profile?.timeseries?.latitude) &&
            Array.isArray(item?.profile?.timeseries?.longitude),
        ) && (
          <div className={styles.timeseriesGrid}>
            <TrajectoryChart
              profiles={visibleResults}
              colorMap={colorMap}
              selectedPoints={visibleSelectedPoints}
              pointsBefore={pointsBefore}
              pointsAfter={pointsAfter}
              formatTimeLabel={formatTrajectoryTime}
            />
          </div>
        )}
      </section>
        </>
      )}
    </>
  );
}

export default memo(AnalysisReport);

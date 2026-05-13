import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import useAnalysisData from "../../hooks/analysis/useAnalysisData";
import useAnalysisPreferences from "../../hooks/analysis/useAnalysisPreferences";
import usePointSelection from "../../hooks/analysis/usePointSelection";
import useLocalStorage from "../../hooks/shared/useLocalStorage";
import { useAnalysisLayout } from "../../components/shared/Layout/AnalysisLayoutContext";
import { getCssVar } from "../../utils/shared/getCssVar";
import {
  makeTimeFormatters,
  formatNumber,
  formatSpeedPair,
  fitSlopeLabel,
} from "../../utils/analysis/analysisFormatters";
import {
  DEFAULT_ANALYSIS_PARAMS,
  DEFAULT_PREPROCESSING,
} from "../../utils/shared/analysisConstants";
import { buildAnalysisProfileRows } from "../../utils/shared/analysisRows";
import {
  buildAnalysisTableConfig,
  EARLY_LATE_TABLE_GRID_COLUMNS,
  EVENT_TABLE_GRID_COLUMNS,
  STATS_TABLE_GRID_COLUMNS,
} from "../../utils/analysis/analysisTableConfig";
import ScopeSwitch from "../../components/shared/ScopeSwitch/ScopeSwitch";
import AnalysisDataTable from "../../components/analysis/AnalysisDataTable/AnalysisDataTable";
import AnalysisParametersForm from "../../components/shared/AnalysisParametersForm/AnalysisParametersForm";
import AnalysisProfilesTable from "../../components/analysis/AnalysisProfilesTable/AnalysisProfilesTable";
import AspChart from "../../components/analysis/AspChart/AspChart";
import DistributionChart from "../../components/analysis/DistributionChart/DistributionChart";
import TimeSeriesChart from "../../components/analysis/TimeSeriesChart/TimeSeriesChart";
import TrajectoryChart from "../../components/analysis/TrajectoryChart/TrajectoryChart";
import AnalysisSidebar from "../../components/analysis/AnalysisSidebar/AnalysisSidebar";
import { exportAllAnalysisZip } from "../../utils/shared/exportAllAnalysisZip";
import {
  exportDirectionalEventTablesZip,
} from "../../utils/shared/exportEventTableCsv";
import { exportFilteredGpsSummaryCsv } from "../../utils/shared/exportFilteredGpsSummaryCsv";
import { hexToRgba } from "../../utils/shared/hexToRgba";

import styles from "./Analysis.module.css";

export default function Analysis() {
  const location = useLocation();
  const { analysisToolsOpen: toolsOpen, setAnalysisToolsOpen: setToolsOpen } = useAnalysisLayout();

  useEffect(() => () => setToolsOpen(false), [setToolsOpen]);

  const analysisState = location.state;
  const results = Array.isArray(analysisState?.results) ? analysisState.results : [];
  const savedColors = analysisState?.color_map || {};

  const defaultColor = getCssVar("--red");
  const [colors, setColors] = useState({});
  const [hiddenMap, setHiddenMap] = useState({});

  const colorMap = useMemo(
    () =>
      Object.fromEntries(
        results.map((item) => [
          item.name,
          colors[item.name] || savedColors[item.name] || defaultColor,
        ]),
      ),
    [results, colors, savedColors, defaultColor],
  );

  const [storedAnalysisParameters] = useLocalStorage("analysis_params", DEFAULT_ANALYSIS_PARAMS);
  const analysisParameters = useMemo(
    () => ({
      ...DEFAULT_ANALYSIS_PARAMS,
      ...storedAnalysisParameters,
      ...(analysisState?.analysis_parameters || {}),
    }),
    [storedAnalysisParameters, analysisState],
  );

  const [storedPreprocessing] = useLocalStorage("analysis_preprocessing", DEFAULT_PREPROCESSING);
  const preprocessingParameters = useMemo(
    () => ({
      ...DEFAULT_PREPROCESSING,
      ...storedPreprocessing,
      ...(analysisState?.preprocessing_parameters || {}),
    }),
    [analysisState, storedPreprocessing],
  );

  const prefs = useAnalysisPreferences();
  const data = useAnalysisData(results, hiddenMap, colorMap, prefs, analysisParameters);
  const points = usePointSelection(data.visibleResults, prefs.timeMode);
  const timeFmt = makeTimeFormatters(prefs.timeMode, data.canUseAbsoluteTimeAxis);

  const {
    speedSeriesUnit,
    profilingSpeedUnit,
    eventSpeedUnit,
    distributionScale,
    setDistributionScale,
    eventBinMode,
    setEventBinMode,
    eventScopeMode,
    setEventScopeMode,
    eventZoneMode,
    setEventZoneMode,
    eventPhaseMode,
    setEventPhaseMode,
    statisticsScopeMode,
    setStatisticsScopeMode,
    profileViewMode,
    setProfileViewMode,
  } = prefs;

  const {
    visibleResults,
    allShown,
    shownCount,
    xAxisTitle,
    accelerationAspProfiles,
    decelerationAspProfiles,
    combinedTimeseries,
    speedReferenceLines,
    combinedStatsRows,
    accelerationEventRows,
    decelerationEventRows,
    speedDistributionChart,
    accelerationDistributionChart,
    decelerationDistributionChart,
    metricUnits,
    formatEventBinLabel,
  } = data;

  const isForceProfile = profileViewMode === "force";
  const hasAccelerationProfiles = accelerationAspProfiles.length > 0;
  const hasDecelerationProfiles = decelerationAspProfiles.length > 0;
  const hasAccelerationEvents = accelerationEventRows.length > 0;
  const hasDecelerationEvents = decelerationEventRows.length > 0;

  const { statsTableData, statsColumns, buildEventColumns, buildEarlyLateEventColumns } =
    buildAnalysisTableConfig({
      styles,
      isForceProfile,
      results,
      metricUnits,
      formatEventBinLabel,
      combinedStatsRows,
    });

  const reportAspRows = buildAnalysisProfileRows({ results, colorMap, hiddenMap });

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
            <AnalysisSidebar
              visibleSelectedPoints={points.visibleSelectedPoints}
              allPointsMarked={points.allPointsMarked}
              markedPointMap={points.markedPointMap}
              setMarkedPointMap={points.setMarkedPointMap}
              pointKey={points.pointKey}
              selectedVisibleCount={points.selectedVisibleCount}
              pointsBefore={points.pointsBefore}
              setPointsBefore={points.setPointsBefore}
              pointsAfter={points.pointsAfter}
              setPointsAfter={points.setPointsAfter}
              setSelectedPoints={points.setSelectedPoints}
              filteredSelectedPoints={points.filteredSelectedPoints}
              toggleSortRule={points.toggleSortRule}
              sortBadge={points.sortBadge}
              formatPointTime={timeFmt.formatPointTime}
            />
          </aside>
        </>
      )}

      <div className={`${styles.timeseriesGrid} ${styles.timeseriesGridCompact}`}>
        <AnalysisParametersForm
          analysisParameters={analysisParameters}
          preprocessingParameters={preprocessingParameters}
          profilingSpeedUnit={profilingSpeedUnit}
          eventSpeedUnit={eventSpeedUnit}
          disabled
        />
      </div>

      <div className={`${styles.toolbar} ${styles.toolbarNoBorder}`}>
        <div className={styles.selectionControls} />
        <button
          className={styles.exportBtn}
          type="button"
          onClick={() =>
            exportAllAnalysisZip({
              results,
              analysisParameters,
              preprocessingParameters,
              perFileParameters: analysisState?.per_file_parameters || {},
            })
          }
        >
          Export All
        </button>
      </div>

      <div className={`${styles.toolbar} ${styles.toolbarNoBorder}`}>
        <div className={styles.selectionControls}>
          <ScopeSwitch
            label="Profile view"
            value={profileViewMode}
            onChange={setProfileViewMode}
            options={[
              { value: "speed", label: "Acceleration-Speed Profile" },
              { value: "force", label: "Force-Velocity Profile" },
            ]}
          />
        </div>
      </div>

      <AnalysisProfilesTable
        rows={reportAspRows}
        exportResults={results}
        allShown={allShown}
        shownCount={shownCount}
        resultsCount={results.length}
        onToggleAll={(checked) => {
          if (checked) {
            setHiddenMap({});
            return;
          }
          const next = {};
          results.forEach((item) => {
            next[`${item.name}::acceleration`] = true;
            next[`${item.name}::deceleration`] = true;
          });
          setHiddenMap(next);
        }}
        onToggleRow={(row, checked) => {
          setHiddenMap((prev) => ({
            ...prev,
            [`${row.fileName}::${row.profileLabel.toLowerCase()}`]: !checked,
          }));
        }}
        onColorChange={(fileName, color) => setColors((prev) => ({ ...prev, [fileName]: color }))}
        formatNumber={formatNumber}
        formatSpeedPair={formatSpeedPair}
        fitSlopeLabel={fitSlopeLabel}
        isForceProfile={isForceProfile}
      />

      {visibleResults.length === 0 ? (
        <div className={styles.empty}>All series hidden. Use "Show".</div>
      ) : (
        <>
          {hasAccelerationProfiles && (
            <AspChart
              profiles={accelerationAspProfiles}
              title={
                isForceProfile
                  ? "Acceleration Force-Velocity Profile"
                  : "Acceleration-Speed Profile"
              }
              yAxisTitle={isForceProfile ? "Force (N)" : "Acceleration (m/s²)"}
              plotMultiplier={1}
              valueMode={isForceProfile ? "force" : "acceleration"}
              colorMap={colorMap}
              onPointSelect={points.onAspPointSelect}
              onPointsSelect={points.onAspPointsSelect}
              selectedPoints={points.visibleSelectedPoints}
              pointsBefore={points.pointsBefore}
              pointsAfter={points.pointsAfter}
            />
          )}

          {hasDecelerationProfiles && (
            <AspChart
              profiles={decelerationAspProfiles}
              title={
                isForceProfile
                  ? "Deceleration Force-Velocity Profile"
                  : "Deceleration-Speed Profile"
              }
              yAxisTitle={isForceProfile ? "Force (N)" : "Deceleration (m/s²)"}
              plotMultiplier={-1}
              valueMode={isForceProfile ? "force" : "acceleration"}
              colorMap={colorMap}
              onPointSelect={points.onAspPointSelect}
              onPointsSelect={points.onAspPointsSelect}
              selectedPoints={points.visibleSelectedPoints}
              pointsBefore={points.pointsBefore}
              pointsAfter={points.pointsAfter}
            />
          )}

          <section className={styles.fileSection}>
            <div className={`${styles.toolbar} ${styles.toolbarNoBorder}`}>
              <div className={styles.selectionControls}>
                <ScopeSwitch
                  label="Statistics scope"
                  value={statisticsScopeMode}
                  onChange={setStatisticsScopeMode}
                  options={[
                    { value: "all", label: "All samples" },
                    { value: "high_speed_running", label: "High-speed running only" },
                  ]}
                />
                <ScopeSwitch
                  label="Pitch zone"
                  value={eventZoneMode}
                  onChange={setEventZoneMode}
                  options={[
                    { value: "full", label: "Full pitch" },
                    { value: "left", label: "Left third" },
                    { value: "middle", label: "Middle third" },
                    { value: "right", label: "Right third" },
                  ]}
                />
              </div>
            </div>

            <AnalysisDataTable
              title="Filtered GPS data statistics"
              columns={statsColumns}
              rows={statsTableData}
              getRowKey={(row) => `${row.fileName}-${row.metric}`}
              getRowStyle={(row) => ({ background: hexToRgba(colorMap[row.fileName], 0.1) })}
              gridTemplateColumns={STATS_TABLE_GRID_COLUMNS}
              exportFileName="filtered_gps_summary.csv"
              onExport={() => exportFilteredGpsSummaryCsv(results)}
            />

            <div className={`${styles.timeseriesGrid} ${styles.timeseriesGridCompact}`}>
              <TimeSeriesChart
                title="Speed"
                yTitle={`Speed (${speedSeriesUnit})`}
                series={combinedTimeseries.speedSeries}
                valueLabelFormatter={() => "Speed"}
                xTitle={xAxisTitle}
                xIncludeZero={xAxisTitle === "Time from start"}
                xTickFormatter={timeFmt.xTickFormatter}
                xHoverFormatter={timeFmt.xHoverFormatter}
                selectedPoints={points.visibleSelectedPoints}
                pointsBefore={points.pointsBefore}
                pointsAfter={points.pointsAfter}
                yReferenceLines={speedReferenceLines}
              />
            </div>
            <div className={styles.timeseriesGrid}>
              <TimeSeriesChart
                title={isForceProfile ? "Force" : "Acceleration"}
                yTitle={isForceProfile ? "Force (N)" : "Acceleration (m/s²)"}
                series={combinedTimeseries.accelerationSeries}
                valueLabelFormatter={(value) => {
                  if (isForceProfile) return "Force";
                  return Number(value) < 0 ? "Deceleration" : "Acceleration";
                }}
                xTitle={xAxisTitle}
                xIncludeZero={xAxisTitle === "Time from start"}
                xTickFormatter={timeFmt.xTickFormatter}
                xHoverFormatter={timeFmt.xHoverFormatter}
                selectedPoints={points.visibleSelectedPoints}
                pointsBefore={points.pointsBefore}
                pointsAfter={points.pointsAfter}
              />
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
                  selectedPoints={points.visibleSelectedPoints}
                  pointsBefore={points.pointsBefore}
                  pointsAfter={points.pointsAfter}
                  formatTimeLabel={timeFmt.formatTrajectoryTime}
                  valueMode={isForceProfile ? "force" : "acceleration"}
                />
              </div>
            )}

            <div className={`${styles.timeseriesGrid} ${styles.timeseriesGridCompact}`}>
              <div className={`${styles.toolbar} ${styles.toolbarNoBorder}`}>
                <div className={styles.selectionControls}>
                  <ScopeSwitch
                    label="Distribution scale"
                    value={distributionScale}
                    onChange={setDistributionScale}
                    options={[
                      { value: "linear", label: "Linear" },
                      { value: "log", label: "Log" },
                    ]}
                  />
                </div>
              </div>
              {speedDistributionChart && (
                <DistributionChart key={speedDistributionChart.key} {...speedDistributionChart} />
              )}
              {accelerationDistributionChart && (
                <DistributionChart
                  key={accelerationDistributionChart.key}
                  {...accelerationDistributionChart}
                />
              )}
              {decelerationDistributionChart && (
                <DistributionChart
                  key={decelerationDistributionChart.key}
                  {...decelerationDistributionChart}
                />
              )}
              <div className={`${styles.toolbar} ${styles.toolbarNoBorder}`}>
                <div className={styles.selectionControls}>
                  <ScopeSwitch
                    label="Event scope"
                    value={eventScopeMode}
                    onChange={setEventScopeMode}
                    options={[
                      { value: "all", label: "All events" },
                      { value: "high_speed_running", label: "High-speed running only" },
                    ]}
                  />
                  <ScopeSwitch
                    label="Pitch zone"
                    value={eventZoneMode}
                    onChange={setEventZoneMode}
                    options={[
                      { value: "full", label: "Full pitch" },
                      { value: "left", label: "Left third" },
                      { value: "middle", label: "Middle third" },
                      { value: "right", label: "Right third" },
                    ]}
                  />
                  <ScopeSwitch
                    label="Event bins"
                    value={eventBinMode}
                    onChange={setEventBinMode}
                    options={[
                      { value: "classic", label: "Classic" },
                      { value: "detailed", label: "Detailed" },
                    ]}
                  />
                  <ScopeSwitch
                    label="View"
                    value={eventPhaseMode}
                    onChange={setEventPhaseMode}
                    options={[
                      { value: "overall", label: "Entire Event" },
                      { value: "early_late", label: "Phase split" },
                    ]}
                  />
                </div>
              </div>
              {hasAccelerationEvents &&
                (eventPhaseMode === "early_late" ? (
                  <AnalysisDataTable
                    title="Acceleration event early/late phase statistics"
                    titleTooltipLines={["Split point = 50% v exit."]}
                    columns={buildEarlyLateEventColumns("acceleration")}
                    rows={accelerationEventRows}
                    getRowKey={(row) => `${row.fileName}-acceleration-event-earlylate-${row.bin}`}
                    getRowStyle={(row) => ({ background: hexToRgba(colorMap[row.fileName], 0.08) })}
                    gridTemplateColumns={EARLY_LATE_TABLE_GRID_COLUMNS}
                    exportFileName="acceleration_event_summary.zip"
                    csvMode="earlyLateSplit"
                    onExport={() =>
                      exportDirectionalEventTablesZip({
                        results,
                        direction: "acceleration",
                        isForceProfile,
                        overallColumns: buildEventColumns(
                          "PP",
                          "HPI",
                          "Ratio (A:D)",
                          "acceleration",
                        ),
                        earlyLateColumns: buildEarlyLateEventColumns("acceleration"),
                      })
                    }
                  />
                ) : (
                  <AnalysisDataTable
                    title="Acceleration event statistics"
                    columns={buildEventColumns("PP", "HPI", "Ratio (A:D)", "acceleration")}
                    rows={accelerationEventRows}
                    getRowKey={(row) => `${row.fileName}-acceleration-event-${row.bin}`}
                    getRowStyle={(row) => ({ background: hexToRgba(colorMap[row.fileName], 0.08) })}
                    gridTemplateColumns={EVENT_TABLE_GRID_COLUMNS}
                    exportFileName="acceleration_event_summary.zip"
                    onExport={() =>
                      exportDirectionalEventTablesZip({
                        results,
                        direction: "acceleration",
                        isForceProfile,
                        overallColumns: buildEventColumns(
                          "PP",
                          "HPI",
                          "Ratio (A:D)",
                          "acceleration",
                        ),
                        earlyLateColumns: buildEarlyLateEventColumns("acceleration"),
                      })
                    }
                  />
                ))}
              {hasDecelerationEvents &&
                (eventPhaseMode === "early_late" ? (
                  <AnalysisDataTable
                    title="Deceleration event early/late phase statistics"
                    titleTooltipLines={["Split point = 50% v entry."]}
                    columns={buildEarlyLateEventColumns("deceleration")}
                    rows={decelerationEventRows}
                    getRowKey={(row) => `${row.fileName}-deceleration-event-earlylate-${row.bin}`}
                    getRowStyle={(row) => ({ background: hexToRgba(colorMap[row.fileName], 0.08) })}
                    gridTemplateColumns={EARLY_LATE_TABLE_GRID_COLUMNS}
                    exportFileName="deceleration_event_summary.zip"
                    csvMode="earlyLateSplit"
                    onExport={() =>
                      exportDirectionalEventTablesZip({
                        results,
                        direction: "deceleration",
                        isForceProfile,
                        overallColumns: buildEventColumns(
                          "BP",
                          "HBI",
                          "Ratio (D:A)",
                          "deceleration",
                        ),
                        earlyLateColumns: buildEarlyLateEventColumns("deceleration"),
                      })
                    }
                  />
                ) : (
                  <AnalysisDataTable
                    title="Deceleration event statistics"
                    columns={buildEventColumns("BP", "HBI", "Ratio (D:A)", "deceleration")}
                    rows={decelerationEventRows}
                    getRowKey={(row) => `${row.fileName}-deceleration-event-${row.bin}`}
                    getRowStyle={(row) => ({ background: hexToRgba(colorMap[row.fileName], 0.08) })}
                    gridTemplateColumns={EVENT_TABLE_GRID_COLUMNS}
                    exportFileName="deceleration_event_summary.zip"
                    onExport={() =>
                      exportDirectionalEventTablesZip({
                        results,
                        direction: "deceleration",
                        isForceProfile,
                        overallColumns: buildEventColumns(
                          "BP",
                          "HBI",
                          "Ratio (D:A)",
                          "deceleration",
                        ),
                        earlyLateColumns: buildEarlyLateEventColumns("deceleration"),
                      })
                    }
                  />
                ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

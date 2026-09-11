import useLocalStorage from "../shared/useLocalStorage";

export default function useAnalysisViewOptions() {
  const [timeSeriesSpeedUnit, setTimeSeriesSpeedUnit] = useLocalStorage(
    "analysis_speed_series_unit",
    "m/s",
  );
  const [profilingSpeedUnit, setProfilingSpeedUnit] = useLocalStorage(
    "analysis_profiling_speed_unit",
    "m/s",
  );
  const [eventSpeedUnit, setEventSpeedUnit] = useLocalStorage("analysis_event_speed_unit", "km/h");
  const [timeMode, setTimeMode] = useLocalStorage("analysis_time_mode", "relative");
  const [distributionYAxisScale, setDistributionYAxisScale] = useLocalStorage(
    "analysis_distribution_scale",
    "log",
  );
  const [binMode, setBinMode] = useLocalStorage("analysis_bin_mode", "detailed");
  const [binMetric, setBinMetric] = useLocalStorage("analysis_bin_metric", "force");
  const [eventActivityScopeMode, setEventActivityScopeMode] = useLocalStorage(
    "analysis_event_activity_scope_mode",
    "high_speed_running",
  );
  const [pitchZoneMode, setPitchZoneMode] = useLocalStorage("analysis_pitch_zone_mode", "full");
  const [eventPhaseMode, setEventPhaseMode] = useLocalStorage(
    "analysis_event_phase_mode",
    "earlyLate",
  );
  const [statsActivityScopeMode, setStatsActivityScopeMode] = useLocalStorage(
    "analysis_stats_activity_scope_mode",
    "all",
  );
  const [analysisMode, setAnalysisMode] = useLocalStorage(
    "analysis_acc_dec_profile_mode",
    "accDecSpeedAnalysisProfile",
  );

  return {
    timeSeriesSpeedUnit,
    setTimeSeriesSpeedUnit,
    timeMode,
    setTimeMode,
    speedUnitsState: {
      profilingSpeedUnit,
      eventSpeedUnit,
      setProfilingSpeedUnit,
      setEventSpeedUnit,
    },
    distributionYAxisScale,
    setDistributionYAxisScale,
    binMode,
    setBinMode,
    binMetric,
    setBinMetric,
    eventActivityScopeMode,
    setEventActivityScopeMode,
    pitchZoneMode,
    setPitchZoneMode,
    eventPhaseMode,
    setEventPhaseMode,
    statsActivityScopeMode,
    setStatsActivityScopeMode,
    analysisMode,
    setAnalysisMode,
  };
}

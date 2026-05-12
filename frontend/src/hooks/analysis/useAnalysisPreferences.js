import useLocalStorage from "../shared/useLocalStorage";

export default function useAnalysisPreferences() {
  const [speedSeriesUnit, setSpeedSeriesUnit] = useLocalStorage(
    "analysis_speed_series_unit",
    "m/s",
  );
  const [profilingSpeedUnit, setProfilingSpeedUnit] = useLocalStorage(
    "analysis_profiling_speed_unit",
    "m/s",
  );
  const [eventSpeedUnit, setEventSpeedUnit] = useLocalStorage("analysis_event_speed_unit", "km/h");
  const [timeMode, setTimeMode] = useLocalStorage("analysis_time_mode", "relative");
  const [distributionScale, setDistributionScale] = useLocalStorage(
    "analysis_distribution_scale",
    "log",
  );
  const [eventBinMode, setEventBinMode] = useLocalStorage("analysis_event_bin_mode", "detailed");
  const [eventScopeMode, setEventScopeMode] = useLocalStorage(
    "analysis_event_scope_mode",
    "high_speed_running",
  );
  const [eventZoneMode, setEventZoneMode] = useLocalStorage("analysis_event_zone_mode", "full");
  const [eventPhaseMode, setEventPhaseMode] = useLocalStorage(
    "analysis_event_phase_mode",
    "overall",
  );
  const [statisticsScopeMode, setStatisticsScopeMode] = useLocalStorage(
    "analysis_statistics_scope_mode",
    "all",
  );
  const [profileViewMode, setProfileViewMode] = useLocalStorage(
    "analysis_profile_view_mode",
    "speed",
  );

  return {
    speedSeriesUnit,
    setSpeedSeriesUnit,
    profilingSpeedUnit,
    setProfilingSpeedUnit,
    eventSpeedUnit,
    setEventSpeedUnit,
    timeMode,
    setTimeMode,
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
  };
}

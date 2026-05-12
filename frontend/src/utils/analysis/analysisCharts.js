import {
  DEFAULT_ANALYSIS_PARAMS,
  HIGH_SPEED_RUNNING_EVENT_LABEL,
} from "../shared/analysisConstants";

const BASELINE_BODY_MASS_KG = DEFAULT_ANALYSIS_PARAMS.body_mass_kg;

export function buildSpeedDistributionChart({
  visibleResults,
  colorMap,
  eventScopeMode,
  eventZoneMode,
  distributionScale,
}) {
  const scopeSuffix = eventScopeMode === "high_speed_running" ? " (High-speed running only)" : "";
  const zoneSuffix = eventZoneMode !== "full" ? ` - ${eventZoneMode}` : "";
  const traces = visibleResults
    .map((item) => {
      const dist = item.profile?.sample_distributions?.[eventScopeMode]?.[eventZoneMode]?.speed;
      const bins = Array.isArray(dist?.bins) ? dist.bins : [];
      if (!bins.length) return null;
      return {
        key: `${item.name}-speed-distribution`,
        type: "bar",
        name: item.name,
        x: bins.map((bin) => (Number(bin.start) + Number(bin.end)) / 2),
        y: bins.map((bin) => Number(bin.count || 0)),
        customdata: bins.map((bin) => [Number(bin.start), Number(bin.end)]),
        width: Number(dist?.bin_size || 1),
        marker: { color: colorMap[item.name] },
        hovertemplate: `${item.name}<br>Speed: %{customdata[0]:.0f} to %{customdata[1]:.0f} m/s<br>Count: %{y}<extra></extra>`,
        showlegend: true,
      };
    })
    .filter(Boolean);
  if (!traces.length) return null;
  const starts = traces.flatMap((t) => t.customdata.map((d) => Number(d[0])));
  const ends = traces.flatMap((t) => t.customdata.map((d) => Number(d[1])));
  const binSize = Number(traces[0]?.width) || 1;
  return {
    key: "speed",
    title: `Speed Distribution${scopeSuffix}${zoneSuffix}`,
    traces,
    barMode: "overlay",
    barGap: 0,
    barGroupGap: 0,
    xAxis: {
      title: { text: "m/s" },
      type: "linear",
      range: [Math.min(...starts), Math.max(...ends)],
      tick0: 0,
      dtick: binSize,
    },
    yAxis: {
      title: { text: "Count" },
      type: distributionScale === "log" ? "log" : "linear",
      rangemode: "tozero",
    },
  };
}

export function buildDirectionalEventDistributionChart({
  direction,
  visibleResults,
  isDirectionVisible,
  eventScopeMode,
  eventZoneMode,
  eventBinMode,
  distributionScale,
  colorMap,
  isForceProfile = false,
}) {
  const axisScale = isForceProfile ? BASELINE_BODY_MASS_KG : 1;
  const axisUnit = isForceProfile ? "N" : "m/s²";
  const titlePrefix = direction === "acceleration" ? "Acceleration" : "Deceleration";
  const hoverLabel = isForceProfile ? "Force" : titlePrefix;
  const sourceKey = direction === "acceleration" ? "acceleration_events" : "deceleration_events";
  const directionalVisibleResults = visibleResults.filter((item) =>
    isDirectionVisible(item.name, direction),
  );
  const scopeKey = eventZoneMode === "full" ? "global" : eventZoneMode;
  const getScopedBins = (payload) =>
    payload?.scopes?.[scopeKey]?.[eventScopeMode]?.bins?.[eventBinMode] || [];
  const binsConfig =
    directionalVisibleResults.find(
      (item) => item.profile?.[sourceKey]?.config?.bins?.[eventBinMode]?.length,
    )?.profile?.[sourceKey]?.config?.bins?.[eventBinMode] || [];
  if (!binsConfig.length) return null;

  const finiteWidths = binsConfig
    .map((bin) => (bin.upper != null ? Number(bin.upper) - Number(bin.lower) : null))
    .filter((width) => Number.isFinite(width) && width > 0);
  const fallbackWidth = finiteWidths.length ? finiteWidths[finiteWidths.length - 1] : 1;
  const lastBinLabel = binsConfig[binsConfig.length - 1].label;
  const lastBinPeakValues = directionalVisibleResults.flatMap((item) => {
    const row = getScopedBins(item.profile?.[sourceKey]).find(
      (entry) => entry.bin === lastBinLabel,
    );
    if (!row) return [];
    return [
      Number(row.mean_first_phase_peak_magnitude),
      Number(row.mean_second_phase_peak_magnitude),
      Number(row.mean_peak_magnitude),
    ].filter((value) => Number.isFinite(value));
  });
  const maxPeakCeiling = lastBinPeakValues.length
    ? Math.ceil(Math.max(...lastBinPeakValues))
    : null;
  const lastLower = Number(binsConfig[binsConfig.length - 1].lower);
  const openBinUpper = Math.max(
    maxPeakCeiling ?? lastLower + fallbackWidth,
    lastLower + fallbackWidth,
  );
  const resolved = binsConfig.map((bin, index) => {
    const lower = Number(bin.lower);
    const upper = bin.upper != null ? Number(bin.upper) : openBinUpper;
    return { label: bin.label, lower, upper, slotStart: index, slotEnd: index + 1 };
  });
  const tickvals = [...resolved.map((bin) => bin.slotStart), resolved[resolved.length - 1].slotEnd];
  const scaleTick = (n) => {
    const v = Number(n) * axisScale;
    return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2)));
  };
  const ticktext = [
    ...resolved.map((bin) => scaleTick(bin.lower)),
    scaleTick(resolved[resolved.length - 1].upper),
  ];
  const formatRangeLabel = (lower, upper, isOpenEnded = false) => {
    const scaledLower = scaleTick(lower);
    const scaledUpper = scaleTick(upper);
    return isOpenEnded
      ? `${hoverLabel}: ${scaledLower}+ ${axisUnit}`
      : `${hoverLabel}: ${scaledLower} to ${scaledUpper} ${axisUnit}`;
  };

  const traces = directionalVisibleResults.map((item) => {
    const binRows = getScopedBins(item.profile?.[sourceKey]);
    const binMap = new Map(binRows.map((row) => [row.bin, Number(row.count || 0)]));
    return {
      key: `${item.name}-${direction}-events`,
      type: "bar",
      name: item.name,
      x: resolved.map((bin) => bin.slotStart + 0.5),
      y: resolved.map((bin) => binMap.get(bin.label) || 0),
      width: resolved.map(() => 1),
      customdata: resolved.map((bin, index) => [
        formatRangeLabel(
          bin.lower,
          bin.upper,
          index === resolved.length - 1 && binsConfig[index]?.upper == null,
        ),
      ]),
      marker: { color: colorMap[item.name] },
      hovertemplate: `${item.name}<br>%{customdata[0]}<br>Count: %{y}<extra></extra>`,
      showlegend: true,
    };
  });

  return {
    key: `${direction}-events-${eventBinMode}`,
    title: `${titlePrefix} Events by Bin${eventScopeMode === "high_speed_running" ? " (High-speed running only)" : ""}${eventZoneMode !== "full" ? ` - ${eventZoneMode}` : ""}`,
    traces,
    barMode: "overlay",
    barGap: 0,
    barGroupGap: 0,
    xAxis: {
      title: { text: `${hoverLabel} (${axisUnit})` },
      type: "linear",
      range: [0, resolved.length],
      tickmode: "array",
      tickvals,
      ticktext,
    },
    yAxis: {
      title: { text: "Event count" },
      type: distributionScale === "log" ? "log" : "linear",
      rangemode: "tozero",
    },
  };
}

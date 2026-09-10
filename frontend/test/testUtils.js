import {
  EVENT_BIN_DEFS,
  PITCH_ZONE_OPTIONS,
  ACTIVITY_SCOPE_OPTIONS,
} from "../src/utils/analysis/constants";
import { kmhToMPerS } from "../src/utils/shared/conversions";

const ZONE_KEYS = PITCH_ZONE_OPTIONS.map((opt) => opt.value);
const SCOPE_KEYS = ACTIVITY_SCOPE_OPTIONS.map((opt) => opt.value);
const BIN_MODES = Object.keys(EVENT_BIN_DEFS);
const BIN_METRICS = ["acc", "force"];

function fromKeys(keys, builder) {
  return Object.fromEntries(keys.map((key) => [key, builder(key)]));
}

function eventStats(overrides = {}) {
  return {
    count: 0,
    density_per_min: null,
    ratio_to_opposite: null,
    mean_magnitude: null,
    mean_relative_power_w_per_kg: null,
    mean_peak_magnitude: null,
    mean_duration: null,
    mean_distance: null,
    mean_horizontal_impulse: null,
    mean_entry_speed: null,
    mean_exit_speed: null,
    mean_early_peak_magnitude: null,
    mean_early_mean_magnitude: null,
    mean_early_mean_relative_power_w_per_kg: null,
    mean_early_peak_relative_power_w_per_kg: null,
    mean_early_duration: null,
    mean_early_distance: null,
    mean_early_impulse: null,
    mean_late_peak_magnitude: null,
    mean_late_mean_magnitude: null,
    mean_late_mean_relative_power_w_per_kg: null,
    mean_late_peak_relative_power_w_per_kg: null,
    mean_late_duration: null,
    mean_late_distance: null,
    mean_late_impulse: null,
    ...overrides,
  };
}

function eventBins(binMode, binMetric, perBinOverrides = () => ({})) {
  return EVENT_BIN_DEFS[binMode][binMetric].map((def, index) =>
    eventStats(perBinOverrides(def, index)),
  );
}

function sampleEvent(overrides = {}) {
  return {
    start_index: 0,
    end_index: 0,
    split_index: 0,
    duration: 0,
    entry_speed: 0,
    exit_speed: 0,
    horizontal_impulse: 0,
    peak_magnitude: 0,
    mean_magnitude: 0,
    mean_relative_power_w_per_kg: 0,
    impulse: 0,
    distance: 0,
    early_duration: 0,
    early_distance: 0,
    early_mean_magnitude: 0,
    early_peak_magnitude: 0,
    early_mean_relative_power_w_per_kg: 0,
    early_peak_relative_power_w_per_kg: 0,
    early_impulse: 0,
    late_duration: 0,
    late_distance: 0,
    late_mean_magnitude: 0,
    late_peak_magnitude: 0,
    late_mean_relative_power_w_per_kg: 0,
    late_peak_relative_power_w_per_kg: 0,
    late_impulse: 0,
    ...overrides,
  };
}

export function directionEvents(builder = () => ({})) {
  return fromKeys(ZONE_KEYS, (zone) =>
    fromKeys(SCOPE_KEYS, (scope) => ({
      events: [sampleEvent(builder(zone, scope, "event") ?? {})],
      stats: eventStats(builder(zone, scope, "stats")),
      bins: fromKeys(BIN_MODES, (binMode) =>
        fromKeys(BIN_METRICS, (binMetric) =>
          eventBins(binMode, binMetric, (def, index) =>
            builder(zone, scope, binMode, binMetric, def, index),
          ),
        ),
      ),
    })),
  );
}

function sampleStat(overrides = {}) {
  return {
    duration: 0,
    speed: { min: 0, mean: 0, median: 0, max: 0, area: 0 },
    acc: { min: 0, mean: 0, median: 0, max: 0, area: 0 },
    dec: { min: 0, mean: 0, median: 0, max: 0, area: 0 },
    ...overrides,
  };
}

export function sampleStats(builder = () => ({})) {
  return fromKeys(ZONE_KEYS, (zone) =>
    fromKeys(SCOPE_KEYS, (scope) => sampleStat(builder(zone, scope))),
  );
}

export function sampleDistributions(builder = () => [0]) {
  return fromKeys(ZONE_KEYS, (zone) => fromKeys(SCOPE_KEYS, (scope) => builder(zone, scope)));
}

function accDecDirectionAnalysisProfileFit(overrides = {}) {
  return { intercept: 0, slope: 0, zero_crossing_speed: 0, r_squared: 0, ...overrides };
}

export function makeAnalysis(overrides = {}) {
  return {
    acc_profile_fit: accDecDirectionAnalysisProfileFit(),
    dec_profile_fit: accDecDirectionAnalysisProfileFit(),
    acc_events: directionEvents(),
    dec_events: directionEvents(),
    time_series: {
      start_time: "00:00:00.0",
      relative_times: [],
      speeds: [],
      accs: [],
      acc_labels: [],
      dec_labels: [],
      x: [],
      y: [],
    },
    sample_stats: sampleStats(),
    sample_distributions: sampleDistributions(),
    meta: {
      min_acc_speed_m_per_s: 3,
      min_dec_speed_m_per_s: 3,
      body_mass_kg: 75,
      bin_size_m_per_s: 0.2,
      extreme_count: 2,
      confidence_level: 0.95,
      min_acc_start_m_per_s2: 1.5,
      min_dec_start_m_per_s2: -1.5,
      min_event_duration_s: 0.3,
      min_high_speed_running_duration_s: 1.0,
      min_high_speed_running_speed_m_per_s: kmhToMPerS(19.0),
    },
    ...overrides,
  };
}

export function makeResult(fileName, analysisOverrides = {}) {
  return { file_name: fileName, analysis: makeAnalysis(analysisOverrides) };
}

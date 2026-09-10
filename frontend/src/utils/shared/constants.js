const parseToNumberOrFallback = (rawInput, fallback) => {
  const parsedInput = Number(rawInput);
  return Number.isFinite(parsedInput) ? parsedInput : fallback;
};
export const atLeast = (minValue) => (rawInput) =>
  Math.max(minValue, parseToNumberOrFallback(rawInput, minValue));
const atLeastInt = (minValue) => (rawInput) =>
  Math.max(minValue, Math.floor(parseToNumberOrFallback(rawInput, minValue)));
const between = (minValue, maxValue) => (rawInput) =>
  Math.min(maxValue, Math.max(minValue, parseToNumberOrFallback(rawInput, minValue)));
const atMost = (maxValue) => (rawInput) =>
  Math.min(maxValue, parseToNumberOrFallback(rawInput, maxValue));

const MAX_HORIZONTAL_ACCURACY = {
  fieldLabel: "Maximum horizontal accuracy (m)",
  tooltipText: "Horizontal accuracy = estimated horizontal position error in meters.",
  key: "maxHorizontalAccuracyM",
  parse: atLeast(0),
  type: "numeric",
  min: "0",
  step: "0.1",
};

const MAX_HORIZONTAL_DILUTION_OF_PRECISION = {
  fieldLabel: "Maximum horizontal dilution of precision",
  tooltipText: "Horizontal dilution of precision = lower values mean better satellite geometry.",
  key: "maxHorizontalDilutionOfPrecision",
  parse: atLeast(0),
  type: "numeric",
  min: "0",
  step: "0.1",
};

const MIN_SATELLITES = {
  fieldLabel: "Minimum satellites",
  key: "minSatelliteCount",
  parse: atLeastInt(0),
  type: "numeric",
  min: "0",
  step: "1",
};

export const FILTER_MODE = {
  fieldLabel: "Filter type",
  key: "filter_mode",
  type: "select",
  options: [
    { value: "none", label: "None" },
    { value: "median", label: "Median" },
    { value: "mean", label: "Mean" },
    { value: "median_mean", label: "Median to Mean" },
    { value: "butterworth", label: "Butterworth (4th order, 2 Hz)" },
  ],
};

export const FILTER_WINDOW_SAMPLES = {
  fieldLabel: "Filter window",
  key: "filter_window_samples",
  parse: atLeastInt(1),
  type: "numeric",
  min: "1",
  step: "1",
};

export const ACC_MIN_SPEED = {
  fieldLabel: "Minimum acceleration speed",
  key: "min_acc_speed_m_per_s",
  parse: atLeast(0),
  type: "speed",
  speedUnitType: "profiling",
  min: "0",
  step: "0.1",
};

export const DEC_MIN_SPEED = {
  fieldLabel: "Minimum deceleration speed",
  key: "min_dec_speed_m_per_s",
  parse: atLeast(0),
  type: "speed",
  speedUnitType: "profiling",
  min: "0",
  step: "0.1",
};

const BIN_SIZE = {
  fieldLabel: "Bin size (m/s)",
  key: "bin_size_m_per_s",
  parse: atLeast(0.1),
  type: "numeric",
  min: "0.1",
  step: "0.1",
};

const EXTREME_COUNT = {
  fieldLabel: "Top points per bin",
  key: "extreme_count",
  parse: atLeastInt(1),
  type: "numeric",
  min: "1",
  step: "1",
};

const CONFIDENCE_LEVEL = {
  fieldLabel: "Confidence level",
  key: "confidence_level",
  parse: between(0.01, 0.999),
  type: "numeric",
  min: "0.01",
  max: "0.999",
  step: "0.01",
};

export const BODY_MASS = {
  fieldLabel: "Body mass (kg)",
  key: "body_mass_kg",
  parse: atLeast(0.1),
  type: "numeric",
  min: "0.1",
  step: "0.1",
};

export const MIN_ACC_START = {
  fieldLabel: "Minimum acceleration for event start (m/s²)",
  key: "min_acc_start_m_per_s2",
  parse: atLeast(0.1),
  type: "numeric",
  min: "0.1",
  step: "0.1",
};

export const MIN_DEC_START = {
  fieldLabel: "Minimum deceleration for event start (m/s²)",
  key: "min_dec_start_m_per_s2",
  parse: atMost(-0.1),
  type: "numeric",
  max: "-0.1",
  step: "0.1",
};

const MIN_EVENT_DURATION = {
  fieldLabel: "Minimum event duration (s)",
  key: "min_event_duration_s",
  parse: atLeast(0.01),
  type: "numeric",
  min: "0.01",
  step: "0.01",
};

export const MIN_HIGH_SPEED_RUNNING_DURATION = {
  fieldLabel: "Minimum high-speed running duration (s)",
  key: "min_high_speed_running_duration_s",
  parse: atLeast(0.01),
  type: "numeric",
  min: "0.01",
  step: "0.01",
};

export const MIN_HIGH_SPEED_RUNNING_SPEED = {
  fieldLabel: "Minimum high-speed running speed",
  key: "min_high_speed_running_speed_m_per_s",
  parse: atLeast(0.1),
  type: "speed",
  speedUnitType: "event",
  min: "0.1",
  step: "0.1",
};

export const CSV_FILTER_PARAM_FIELDS = [
  MAX_HORIZONTAL_ACCURACY,
  MAX_HORIZONTAL_DILUTION_OF_PRECISION,
  MIN_SATELLITES,
];

export const PREPROCESSING_PARAM_FIELDS = [FILTER_MODE, FILTER_WINDOW_SAMPLES];

export const PROFILING_PARAM_FIELDS = [
  ACC_MIN_SPEED,
  DEC_MIN_SPEED,
  BIN_SIZE,
  EXTREME_COUNT,
  CONFIDENCE_LEVEL,
  BODY_MASS,
];

export const EVENT_PARAM_FIELDS = [
  MIN_HIGH_SPEED_RUNNING_SPEED,
  MIN_HIGH_SPEED_RUNNING_DURATION,
  MIN_ACC_START,
  MIN_DEC_START,
  MIN_EVENT_DURATION,
];

export const PER_SELECTED_FILE_PARAM_FIELDS = [
  BODY_MASS,
  ACC_MIN_SPEED,
  DEC_MIN_SPEED,
  MIN_HIGH_SPEED_RUNNING_SPEED,
  MIN_HIGH_SPEED_RUNNING_DURATION,
  MIN_ACC_START,
  MIN_DEC_START,
  MIN_EVENT_DURATION,
];

export const DEFAULT_ANALYSIS_PARAMS = {
  min_acc_speed_m_per_s: 3,
  min_dec_speed_m_per_s: 3,
  bin_size_m_per_s: 0.2,
  extreme_count: 2,
  confidence_level: 0.95,
  body_mass_kg: 75,
  min_high_speed_running_speed_m_per_s: 19 / 3.6,
  min_high_speed_running_duration_s: 1,
  min_acc_start_m_per_s2: 1.5,
  min_dec_start_m_per_s2: -1.5,
  min_event_duration_s: 0.3,
};

export const DEFAULT_CSV_FILTER = {
  maxHorizontalAccuracyM: 2,
  maxHorizontalDilutionOfPrecision: 1,
  minSatelliteCount: 6,
};

export const DEFAULT_PREPROCESSING = {
  filter_mode: "butterworth",
  filter_window_samples: 5,
};

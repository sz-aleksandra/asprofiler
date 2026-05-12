export const PITCH_LENGTH_METERS = 105;

export const DEFAULT_ANALYSIS_PARAMS = {
  min_speed: 3,
  deceleration_min_speed: 3,
  bin_size: 0.2,
  extreme_n: 2,
  confidence_level: 0.95,
  body_mass_kg: 75,
  minimum_acceleration_for_event_start: 1.5,
  minimum_deceleration_for_event_start: -1.5,
  minimum_event_duration_seconds: 0.3,
  minimum_high_speed_running_duration_seconds: 1,
  minimum_high_speed_running_speed_meters_per_second: 19 / 3.6,
};

export const DEFAULT_PREPROCESSING = {
  filter_window: 5,
  filter_mode: "butterworth",
  maximum_horizontal_accuracy_meters: 2,
  maximum_horizontal_dilution_of_precision: 1,
  minimum_satellites: 6,
};

export const HIGH_SPEED_RUNNING_EVENT_LABEL = "All";

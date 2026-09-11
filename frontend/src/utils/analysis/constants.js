import { safeScaleByMass } from "./formatters";

export const ACC_DEC_DIRECTIONS = ["acc", "dec"];

export const ACC_DEC_DIRECTION_CONFIGS = [
  { accDecDirection: "acc", accDecDirectionLabel: "Acceleration", accDecDirectionMultiplier: 1 },
  { accDecDirection: "dec", accDecDirectionLabel: "Deceleration", accDecDirectionMultiplier: -1 },
];

export const SORT_COLUMNS = [
  { columnKey: "fileName", columnLabel: "File name" },
  { columnKey: "relativeTime", columnLabel: "Time" },
  { columnKey: "speed", columnLabel: "Speed" },
  { columnKey: "metricValue", columnLabel: "Metric" },
];

export const ACTIVITY_SCOPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "high_speed_running", label: "High-speed running only" },
];

export const PITCH_ZONE_OPTIONS = [
  { value: "full", label: "Full pitch" },
  { value: "left", label: "Left third" },
  { value: "middle", label: "Middle third" },
  { value: "right", label: "Right third" },
];

export const BIN_BASELINE_MASS = 75;

const EVENT_ACC_BINS_DEFS = {
  classic: [
    { binLabel: "Low", binLowerBound: 0, binUpperBound: 2.5 },
    { binLabel: "High", binLowerBound: 2.5, binUpperBound: 3.5 },
    { binLabel: "Very High", binLowerBound: 3.5, binUpperBound: null },
  ],
  detailed: [
    { binLabel: "0-3", binLowerBound: 0, binUpperBound: 3.0 },
    { binLabel: "3-4", binLowerBound: 3.0, binUpperBound: 4.0 },
    { binLabel: "4-5", binLowerBound: 4.0, binUpperBound: 5.0 },
    { binLabel: "5-6", binLowerBound: 5.0, binUpperBound: 6.0 },
    { binLabel: "6-7", binLowerBound: 6.0, binUpperBound: 7.0 },
    { binLabel: ">=7", binLowerBound: 7.0, binUpperBound: null },
  ],
};

export const EVENT_BIN_DEFS = Object.fromEntries(
  Object.entries(EVENT_ACC_BINS_DEFS).map(([binMode, accBinsDefs]) => [
    binMode,
    {
      acc: accBinsDefs,
      force: accBinsDefs.map((accBinDef) => ({
        binLabel: accBinDef.binLabel,
        binLowerBound: accBinDef.binLowerBound * BIN_BASELINE_MASS,
        binUpperBound:
          accBinDef.binUpperBound == null ? null : accBinDef.binUpperBound * BIN_BASELINE_MASS,
      })),
    },
  ]),
);

export const BIN_MODE_OPTIONS = [
  { value: "classic", label: "Classic" },
  { value: "detailed", label: "Detailed" },
];

export const BIN_METRIC_OPTIONS = [
  { value: "acc", label: "Acceleration" },
  { value: "force", label: "Force" },
];

export const DISTRIBUTION_Y_AXIS_SCALE_OPTIONS = [
  { value: "linear", label: "Linear" },
  { value: "log", label: "Log" },
];

export const EVENT_PHASE_OPTIONS = [
  { value: "entire", label: "Entire Event" },
  { value: "earlyLate", label: "Phase split" },
];

export const ANALYSIS_MODE_OPTIONS = [
  { value: "accDecSpeedAnalysisProfile", label: "Acceleration / Deceleration" },
  { value: "forceVelocityAnalysisProfile", label: "Force" },
];

const ACC_DEC_ANALYSIS_PROFILE_CONFIG = {
  chartTitleSuffix: "-Speed Analysis Profile",
  isForce: false,
  metricLabel: "Acceleration",
  metricUnit: "m/s²",
  interceptLabel: "A0",
  equationSymbol: "a",
  powerLabelPrefix: "relative ",
  scaleStatValueByMass: (statValue) => statValue,
  magnitudeLabelSuffix: "",
  brakingLabel: "Relative braking",
  powerLabel: "relative horizontal power",
  powerFormulaLabelSuffix: "",
  propulsiveLabel: "Relative propulsive",
  powerUnit: "W/kg",
  mode: "accDecSpeedAnalysisProfile",
};

const FORCE_VELOCITY_ANALYSIS_PROFILE_CONFIG = {
  chartTitleSuffix: " Force-Velocity Analysis Profile",
  isForce: true,
  metricLabel: "Force",
  metricUnit: "N",
  interceptLabel: "F0",
  equationSymbol: "F",
  powerLabelPrefix: "",
  scaleStatValueByMass: safeScaleByMass,
  magnitudeLabelSuffix: " force",
  brakingLabel: "Braking",
  powerLabel: "horizontal power",
  powerFormulaLabelSuffix: " · mass",
  propulsiveLabel: "Propulsive",
  powerUnit: "W",
  mode: "forceVelocityAnalysisProfile",
};

const ANALYSIS_PROFILE_CONFIG_BY_MODE = {
  accDecSpeedAnalysisProfile: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
  forceVelocityAnalysisProfile: FORCE_VELOCITY_ANALYSIS_PROFILE_CONFIG,
};

export function getAnalysisProfileConfig(mode) {
  return ANALYSIS_PROFILE_CONFIG_BY_MODE[mode];
}

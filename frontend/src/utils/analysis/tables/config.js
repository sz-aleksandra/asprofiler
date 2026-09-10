import { binLabelToRangeText } from "../formatters";

import {
  buildEarlyLateEventStatTableColumns,
  buildEntireEventStatTableColumns,
  buildFilteredSampleStatsColumns,
} from "./columns";
const METRIC_STATS_TABLE_UNITS = {
  speed: {
    value: "m/s",
    area: "km",
  },
  acc: {
    value: "m/s²",
    area: "m/s",
  },
  dec: {
    value: "m/s²",
    area: "m/s",
  },
  accForce: {
    value: "N",
    area: "N·s",
  },
  decForce: {
    value: "N",
    area: "N·s",
  },
};
export const EVENT_TABLE_CONFIG = [
  {
    accDecDirection: "acc",
    accDecDirectionLabel: "Acceleration",
    entireEventColumnLabels: ["PP", "HPI", "Ratio (A:D)"],
    earlyLateTooltip: "Split point = 50% between v_entry and v_exit.",
  },
  {
    accDecDirection: "dec",
    accDecDirectionLabel: "Deceleration",
    entireEventColumnLabels: ["BP", "HBI", "Ratio (D:A)"],
    earlyLateTooltip: "Split point = 50% between v_entry and v_exit.",
  },
];
export function buildAccDecDirectionAnalysisProfileFitHeaders(analysisProfileConfig) {
  return [
    {
      accDecDirectionAnalysisProfileFitHeaderLabel: analysisProfileConfig.interceptLabel,
      accDecDirectionAnalysisProfileFitTooltipText: [
        analysisProfileConfig.isForce
          ? "Intercept = hypothetical maximum absolute force."
          : "Intercept = hypothetical maximum absolute acceleration.",
      ],
    },
    {
      accDecDirectionAnalysisProfileFitHeaderLabel: "V0",
      accDecDirectionAnalysisProfileFitTooltipText: [
        "Zero crossing speed = hypothetical maximum speed.",
      ],
    },
    {
      accDecDirectionAnalysisProfileFitHeaderLabel: "R²",
      accDecDirectionAnalysisProfileFitTooltipText: [
        "Coefficient of determination = fit quality (1 = perfect fit).",
      ],
    },
  ];
}
export function formatEventBinLabel(binLabel, binMode, binMetric) {
  if (binLabel === "All") return binLabel;
  const rangeText = binLabelToRangeText(binLabel, binMode, binMetric);
  return binMode === "classic" ? `${binLabel} (${rangeText})` : rangeText;
}
export function buildAnalysisTableConfig({
  analysisResults,
  filteredSampleStatsTableRows,
  analysisProfileConfig,
  formatEventBinLabel,
}) {
  const bodyMassByFile = new Map(
    analysisResults.map((analysisResult) => [
      analysisResult.file_name,
      analysisResult.analysis.meta.body_mass_kg,
    ]),
  );
  return {
    filteredSampleStatsTableRows: filteredSampleStatsTableRows.map((filteredSampleStatsRow) => ({
      ...filteredSampleStatsRow,
      units: METRIC_STATS_TABLE_UNITS[filteredSampleStatsRow.tableMetricKey],
    })),
    statsColumns: buildFilteredSampleStatsColumns({
      analysisProfileConfig,
    }),
    buildEntireEventStatTableColumns: (
      horizontalPowerLabel,
      impulseLabel,
      ratioLabel,
      accDecDirection,
    ) =>
      buildEntireEventStatTableColumns({
        horizontalPowerLabel,
        impulseLabel,
        ratioLabel,
        accDecDirection,
        analysisProfileConfig,
        getEventBodyMass: (fileName) => bodyMassByFile.get(fileName),
        formatEventBinLabel,
      }),
    buildEarlyLateEventStatTableColumns: (accDecDirection) =>
      buildEarlyLateEventStatTableColumns({
        accDecDirection,
        analysisProfileConfig,
        getEventBodyMass: (fileName) => bodyMassByFile.get(fileName),
        formatEventBinLabel,
      }),
  };
}

import {
  renderEarlyLateCell,
  renderSpeedStatCellValue,
} from "../../../components/analysis/DataTableCells/DataTableCells";
import HeaderLabel from "../../../ui/HeaderLabel/HeaderLabel";
import { formatToTwoDecimalPlaces, formatOrDash, secondsToTime, safeAbs } from "../formatters";
const IMPULSE_TOOLTIP_TEXT = {
  dec: ["Horizontal Braking Impulse = change in momentum [mass · (exit speed - entry speed)]."],
  acc: [
    "Horizontal Propulsive Impulse = Horizontal Braking Impulse equivalent for acceleration [HBI = mass · (exit speed - entry speed)].",
  ],
};
function formatStatValueWithUnit(statValue, statUnit) {
  return formatOrDash(
    statValue,
    (numericStatValue) => `${numericStatValue.toFixed(2)} ${statUnit}`,
  );
}
function formatEarlyLateTriplet(formatStatValue, earlyStatValue, lateStatValue) {
  const absEarlyStatValue = safeAbs(earlyStatValue);
  const absLateStatValue = safeAbs(lateStatValue);
  return [
    formatStatValue(absEarlyStatValue),
    formatStatValue(absLateStatValue),
    absEarlyStatValue != null && absLateStatValue != null && absLateStatValue !== 0
      ? (absEarlyStatValue / absLateStatValue).toFixed(2)
      : "-",
  ];
}
function buildStatColumn(columnKey, columnHeader, renderCell) {
  return {
    columnKey,
    renderHeader: () => columnHeader,
    cellClassName: "columnValue",
    renderCell,
  };
}
export function buildFilteredSampleStatsColumns({ analysisProfileConfig }) {
  const buildAggregateStatColumn = (columnKey, columnHeader) => ({
    columnKey,
    renderHeader: () => columnHeader,
    cellClassName: "columnValue",
    renderCell: (sampleStatsRow) =>
      sampleStatsRow.tableMetricKey === "speed"
        ? renderSpeedStatCellValue(sampleStatsRow.stats[columnKey])
        : formatStatValueWithUnit(sampleStatsRow.stats[columnKey], sampleStatsRow.units.value),
  });
  return [
    {
      columnKey: "metric",
      renderHeader: () => "",
      cellClassName: "columnLabel",
      renderCell: (sampleStatsRow) => `${sampleStatsRow.fileName} ${sampleStatsRow.metricLabel}`,
    },
    buildAggregateStatColumn("min", "Min"),
    buildAggregateStatColumn("mean", "Mean"),
    buildAggregateStatColumn("median", "Median"),
    buildAggregateStatColumn("max", "Max"),
    {
      columnKey: "duration",
      renderHeader: () => <HeaderLabel headerText="Duration" headerTooltipLines={["HH:MM:SS.s"]} />,
      cellClassName: "columnValue",
      renderCell: (sampleStatsRow) => secondsToTime(sampleStatsRow.duration),
    },
    {
      columnKey: "area",
      cellClassName: "columnValue",
      renderHeader: () => (
        <HeaderLabel
          headerText="Area"
          headerTooltipLines={[
            "Speed area = total distance.",
            analysisProfileConfig.isForce
              ? "Force area = accumulated impulse."
              : "Acceleration area = accumulated speed change.",
          ]}
        />
      ),
      renderCell: (sampleStatsRow) =>
        sampleStatsRow.tableMetricKey === "speed"
          ? formatOrDash(
              sampleStatsRow.stats.area,
              (distanceMeters) => `${(distanceMeters / 1000).toFixed(2)} km`,
            )
          : sampleStatsRow.units.area
            ? formatStatValueWithUnit(sampleStatsRow.stats.area, sampleStatsRow.units.area)
            : "-",
    },
  ];
}
export function buildEntireEventStatTableColumns({
  accDecDirection,
  analysisProfileConfig,
  horizontalPowerLabel,
  impulseLabel,
  getEventBodyMass,
  formatEventBinLabel,
  ratioLabel,
}) {
  const isDecDirection = accDecDirection === "dec";
  const horizontalPowerHeader = `Mean ${analysisProfileConfig.powerLabelPrefix}${horizontalPowerLabel}`;
  const impulseHeader = `Mean ${impulseLabel}`;
  const scaleStatValueByMassForFile = (fileName, statValue) =>
    analysisProfileConfig.scaleStatValueByMass(statValue, getEventBodyMass(fileName));
  return [
    {
      columnKey: "fileName",
      renderHeader: () => "File name",
      cellClassName: "columnLabel",
      renderCell: (eventRow) => eventRow.fileName,
    },
    buildStatColumn("bin", `Bin (${analysisProfileConfig.metricUnit})`, (eventRow) =>
      formatEventBinLabel(eventRow.binLabel),
    ),
    buildStatColumn("count", "Count", (eventRow) =>
      formatOrDash(eventRow.stats.count, (eventCount) => String(Math.round(eventCount))),
    ),
    buildStatColumn(
      "density",
      "Density",
      (eventRow) => `${formatToTwoDecimalPlaces(eventRow.stats.density_per_min)}/min`,
    ),
    {
      columnKey: "ratio",
      cellClassName: "columnValue",
      renderHeader: () => (
        <HeaderLabel
          headerText={ratioLabel}
          headerTooltipLines={
            isDecDirection
              ? ["deceleration count / acceleration count."]
              : ["acceleration count / deceleration count."]
          }
        />
      ),
      renderCell: (eventRow) => formatToTwoDecimalPlaces(eventRow.stats.ratio_to_opposite),
    },
    buildStatColumn("duration", "Mean duration", (eventRow) =>
      formatOrDash(
        eventRow.stats.mean_duration,
        (durationSeconds) => `${durationSeconds.toFixed(2)} s`,
      ),
    ),
    buildStatColumn("distance", "Mean distance", (eventRow) =>
      formatStatValueWithUnit(eventRow.stats.mean_distance, "m"),
    ),
    buildStatColumn("entrySpeed", "Mean entry speed", (eventRow) =>
      renderSpeedStatCellValue(eventRow.stats.mean_entry_speed),
    ),
    buildStatColumn("exitSpeed", "Mean exit speed", (eventRow) =>
      renderSpeedStatCellValue(eventRow.stats.mean_exit_speed),
    ),
    buildStatColumn(
      "magnitude",
      `Mean ${isDecDirection ? "deceleration" : "acceleration"}${analysisProfileConfig.magnitudeLabelSuffix}`,
      (eventRow) =>
        formatStatValueWithUnit(
          scaleStatValueByMassForFile(eventRow.fileName, eventRow.stats.mean_magnitude),
          analysisProfileConfig.metricUnit,
        ),
    ),
    {
      columnKey: "horizontalPower",
      cellClassName: "columnValue",
      renderHeader: () => (
        <HeaderLabel
          headerText={horizontalPowerHeader}
          headerTooltipLines={
            isDecDirection
              ? [
                  `${analysisProfileConfig.brakingLabel} power = ${analysisProfileConfig.powerLabel} (absolute acceleration · speed${analysisProfileConfig.powerFormulaLabelSuffix}).`,
                ]
              : [
                  `${analysisProfileConfig.propulsiveLabel} power = ${analysisProfileConfig.brakingLabel} power equivalent for acceleration (absolute acceleration · speed${analysisProfileConfig.powerFormulaLabelSuffix}).`,
                ]
          }
        />
      ),
      renderCell: (eventRow) =>
        formatStatValueWithUnit(
          scaleStatValueByMassForFile(
            eventRow.fileName,
            eventRow.stats.mean_relative_power_w_per_kg,
          ),
          analysisProfileConfig.powerUnit,
        ),
    },
    {
      columnKey: "impulse",
      cellClassName: "columnValue",
      renderHeader: () => (
        <HeaderLabel
          headerText={impulseHeader}
          headerTooltipLines={IMPULSE_TOOLTIP_TEXT[accDecDirection]}
        />
      ),
      renderCell: (eventRow) =>
        formatStatValueWithUnit(
          scaleStatValueByMassForFile(
            eventRow.fileName,
            safeAbs(eventRow.stats.mean_horizontal_impulse),
          ),
          "N·s",
        ),
    },
  ];
}
export function buildEarlyLateEventStatTableColumns({
  analysisProfileConfig,
  getEventBodyMass,
  accDecDirection,
  formatEventBinLabel,
}) {
  const scaleStatValueByMassForFile = (fileName, statValue) =>
    analysisProfileConfig.scaleStatValueByMass(statValue, getEventBodyMass(fileName));
  const isDecDirection = accDecDirection === "dec";
  const lowercaseDirectionLabel = isDecDirection ? "deceleration" : "acceleration";
  const horizontalPowerAbbreviation = isDecDirection ? "BP" : "PP";
  const binHeader = `Bin (${analysisProfileConfig.metricUnit})`;
  const buildEarlyLateEventStatColumn = ({
    transformStatValue,
    earlyStatKey,
    lateStatKey,
    columnKey,
    renderHeader,
    formatStatValue,
  }) => {
    const getEarlyStatValue = (eventRow) =>
      transformStatValue
        ? transformStatValue(eventRow.fileName, eventRow.stats[earlyStatKey])
        : eventRow.stats[earlyStatKey];
    const getLateStatValue = (eventRow) =>
      transformStatValue
        ? transformStatValue(eventRow.fileName, eventRow.stats[lateStatKey])
        : eventRow.stats[lateStatKey];
    const earlyLateEventStatColumn = {
      columnKey,
      renderHeader,
      cellClassName: "columnValue",
      renderCell: (eventRow) =>
        renderEarlyLateCell(
          formatEarlyLateTriplet(
            formatStatValue,
            getEarlyStatValue(eventRow),
            getLateStatValue(eventRow),
          ),
        ),
    };
    return earlyLateEventStatColumn;
  };
  return [
    {
      columnKey: "fileName",
      renderHeader: () => "File name",
      cellClassName: "columnLabel",
      renderCell: (eventRow) => eventRow.fileName,
    },
    {
      columnKey: "bin",
      renderHeader: () => binHeader,
      cellClassName: "columnValue",
      renderCell: (eventRow) => {
        const eventBinLabel = formatEventBinLabel(eventRow.binLabel);
        return renderEarlyLateCell([
          `${eventBinLabel} early`,
          `${eventBinLabel} late`,
          `${eventBinLabel} early/late`,
        ]);
      },
    },
    buildEarlyLateEventStatColumn({
      columnKey: "duration",
      renderHeader: () => "Mean duration",
      formatStatValue: (statValue) =>
        formatOrDash(statValue, (durationSeconds) => `${durationSeconds.toFixed(2)} s`),
      earlyStatKey: "mean_early_duration",
      lateStatKey: "mean_late_duration",
    }),
    buildEarlyLateEventStatColumn({
      columnKey: "distance",
      renderHeader: () => "Mean distance",
      formatStatValue: (statValue) => formatStatValueWithUnit(statValue, "m"),
      earlyStatKey: "mean_early_distance",
      lateStatKey: "mean_late_distance",
    }),
    buildEarlyLateEventStatColumn({
      columnKey: "meanMagnitude",
      renderHeader: () =>
        `Mean ${lowercaseDirectionLabel}${analysisProfileConfig.magnitudeLabelSuffix} average`,
      formatStatValue: (statValue) =>
        formatStatValueWithUnit(statValue, analysisProfileConfig.metricUnit),
      earlyStatKey: "mean_early_mean_magnitude",
      lateStatKey: "mean_late_mean_magnitude",
      transformStatValue: scaleStatValueByMassForFile,
    }),
    buildEarlyLateEventStatColumn({
      columnKey: "peakMagnitude",
      renderHeader: () =>
        `Mean ${lowercaseDirectionLabel}${analysisProfileConfig.magnitudeLabelSuffix} peak`,
      formatStatValue: (statValue) =>
        formatStatValueWithUnit(statValue, analysisProfileConfig.metricUnit),
      earlyStatKey: "mean_early_peak_magnitude",
      lateStatKey: "mean_late_peak_magnitude",
      transformStatValue: scaleStatValueByMassForFile,
    }),
    buildEarlyLateEventStatColumn({
      columnKey: "meanHorizontalPower",
      renderHeader: () => (
        <HeaderLabel
          headerText={`Mean ${analysisProfileConfig.powerLabelPrefix}${horizontalPowerAbbreviation} average`}
          headerTooltipLines={
            isDecDirection
              ? [
                  `${analysisProfileConfig.brakingLabel} power average = average ${analysisProfileConfig.powerLabel} [max(absolute acceleration · event speed${analysisProfileConfig.powerFormulaLabelSuffix})].`,
                ]
              : [
                  `${analysisProfileConfig.propulsiveLabel} power average = ${analysisProfileConfig.powerLabelPrefix}braking power average equivalent for acceleration [mean(absolute acceleration · speed${analysisProfileConfig.powerFormulaLabelSuffix})].`,
                ]
          }
        />
      ),
      formatStatValue: (statValue) =>
        formatStatValueWithUnit(statValue, analysisProfileConfig.powerUnit),
      earlyStatKey: "mean_early_mean_relative_power_w_per_kg",
      lateStatKey: "mean_late_mean_relative_power_w_per_kg",
      transformStatValue: scaleStatValueByMassForFile,
    }),
    buildEarlyLateEventStatColumn({
      columnKey: "peakHorizontalPower",
      renderHeader: () => (
        <HeaderLabel
          headerText={`Mean ${analysisProfileConfig.powerLabelPrefix}${horizontalPowerAbbreviation} peak`}
          headerTooltipLines={
            isDecDirection
              ? [
                  `${analysisProfileConfig.brakingLabel} power peak = peak ${analysisProfileConfig.powerLabel} [max(absolute acceleration · speed${analysisProfileConfig.powerFormulaLabelSuffix})].`,
                ]
              : [
                  `${analysisProfileConfig.propulsiveLabel} power peak = ${analysisProfileConfig.powerLabelPrefix}braking power peak equivalent for acceleration [max(absolute acceleration · speed${analysisProfileConfig.powerFormulaLabelSuffix})].`,
                ]
          }
        />
      ),
      formatStatValue: (statValue) =>
        formatStatValueWithUnit(statValue, analysisProfileConfig.powerUnit),
      earlyStatKey: "mean_early_peak_relative_power_w_per_kg",
      lateStatKey: "mean_late_peak_relative_power_w_per_kg",
      transformStatValue: scaleStatValueByMassForFile,
    }),
    buildEarlyLateEventStatColumn({
      columnKey: "impulse",
      renderHeader: () => (
        <HeaderLabel
          headerText={`Mean ${isDecDirection ? "HBI" : "HPI"}`}
          headerTooltipLines={IMPULSE_TOOLTIP_TEXT[accDecDirection]}
        />
      ),
      formatStatValue: (statValue) => formatStatValueWithUnit(statValue, "N·s"),
      earlyStatKey: "mean_early_impulse",
      lateStatKey: "mean_late_impulse",
      transformStatValue: scaleStatValueByMassForFile,
    }),
  ];
}

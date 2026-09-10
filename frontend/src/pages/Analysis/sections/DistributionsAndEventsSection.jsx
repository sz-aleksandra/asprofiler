import DataTable from "../../../components/analysis/DataTable/DataTable";
import DistributionChart from "../../../components/analysis/DistributionChart/DistributionChart";
import { SelectField } from "../../../ui/form/fields/ParamFields";
import {
  DISTRIBUTION_Y_AXIS_SCALE_OPTIONS,
  BIN_METRIC_OPTIONS,
  BIN_MODE_OPTIONS,
  EVENT_PHASE_OPTIONS,
  PITCH_ZONE_OPTIONS,
  ACTIVITY_SCOPE_OPTIONS,
} from "../../../utils/analysis/constants";
import { buildEventsExportFilesForAccDecDirection } from "../../../utils/analysis/export/events/eventsBundleExport";
import { downloadZip } from "../../../utils/analysis/export/output";
import { hexToRgba } from "../../../utils/analysis/formatters";
import { EVENT_TABLE_CONFIG } from "../../../utils/analysis/tables/config";

import styles from "./DistributionsAndEventsSection.module.css";
export default function DistributionsAndEventsSection({
  analysisViewModel,
  analysisViewOptions,
  analysisTableConfig,
  colorMap,
  analysisResults,
}) {
  const chartConfigs = [
    analysisViewModel.speedDistributionChart,
    analysisViewModel.eventDistributionCharts.acc,
    analysisViewModel.eventDistributionCharts.dec,
  ].filter(Boolean);
  const eventViewOptionFieldConfigs = [
    {
      fieldLabel: "Activity scope",
      fieldValue: analysisViewOptions.eventActivityScopeMode,
      onFieldChange: analysisViewOptions.setEventActivityScopeMode,
      fieldOptions: ACTIVITY_SCOPE_OPTIONS,
    },
    {
      fieldLabel: "Pitch zone",
      fieldValue: analysisViewOptions.pitchZoneMode,
      onFieldChange: analysisViewOptions.setPitchZoneMode,
      fieldOptions: PITCH_ZONE_OPTIONS,
    },
    {
      fieldLabel: "Event bins",
      fieldValue: analysisViewOptions.binMode,
      onFieldChange: analysisViewOptions.setBinMode,
      fieldOptions: BIN_MODE_OPTIONS,
    },
    {
      fieldLabel: "Bin by",
      fieldValue: analysisViewOptions.binMetric,
      onFieldChange: analysisViewOptions.setBinMetric,
      fieldOptions: BIN_METRIC_OPTIONS,
    },
  ];
  const renderEventViewOptionField = (eventViewOptionFieldConfig) => (
    <SelectField
      key={eventViewOptionFieldConfig.fieldLabel}
      {...eventViewOptionFieldConfig}
      isDisabled={false}
    />
  );
  return (
    <div className={styles.distributionsAndEventsSectionGrid}>
      <div className={styles.analysisViewOptionsToolbar}>
        <div className={styles.analysisViewOptionsToolbarFieldsRow}>
          <SelectField
            fieldLabel="Distribution scale"
            fieldOptions={DISTRIBUTION_Y_AXIS_SCALE_OPTIONS}
            fieldValue={analysisViewOptions.distributionYAxisScale}
            isDisabled={false}
            onFieldChange={analysisViewOptions.setDistributionYAxisScale}
          />
        </div>
      </div>

      {chartConfigs.map((chartConfig) => (
        <DistributionChart key={chartConfig.distributionChartKey} {...chartConfig} />
      ))}

      <div className={styles.analysisViewOptionsToolbar}>
        <div className={styles.analysisViewOptionsToolbarFieldsRow}>
          {eventViewOptionFieldConfigs.map(renderEventViewOptionField)}
        </div>
      </div>

      <div className={styles.analysisViewOptionsToolbar}>
        <div className={styles.analysisViewOptionsToolbarFieldsRow}>
          <SelectField
            fieldLabel="View"
            fieldOptions={EVENT_PHASE_OPTIONS}
            fieldValue={analysisViewOptions.eventPhaseMode}
            isDisabled={false}
            onFieldChange={analysisViewOptions.setEventPhaseMode}
          />
        </div>
      </div>

      {EVENT_TABLE_CONFIG.map(
        ({ accDecDirection, entireEventColumnLabels, accDecDirectionLabel, earlyLateTooltip }) => {
          const eventRowsForAccDecDirection = analysisViewModel.eventRows[accDecDirection];
          if (!eventRowsForAccDecDirection.length) return null;
          const isEarlyLateEventPhase = analysisViewOptions.eventPhaseMode === "earlyLate";
          const eventTableColumns = isEarlyLateEventPhase
            ? analysisTableConfig.buildEarlyLateEventStatTableColumns(accDecDirection)
            : analysisTableConfig.buildEntireEventStatTableColumns(
                ...entireEventColumnLabels,
                accDecDirection,
              );
          return (
            <DataTable
              dataTableColumns={eventTableColumns}
              dataTableTitle={`${accDecDirectionLabel} event${isEarlyLateEventPhase ? " early/late phase" : ""} statistics`}
              dataTableTitleTooltipText={isEarlyLateEventPhase ? [earlyLateTooltip] : undefined}
              getDataTableRowKey={(eventRow) =>
                `${eventRow.fileName}-${accDecDirection}-event${isEarlyLateEventPhase ? "-earlylate" : ""}-${eventRow.binLabel}`
              }
              getDataTableRowStyle={(eventRow) => ({
                background: hexToRgba(colorMap[eventRow.fileName], 0.1),
              })}
              gridTemplateColumns={
                isEarlyLateEventPhase
                  ? "minmax(206px, 1.22fr) repeat(8, minmax(70px, 1fr))"
                  : "minmax(206px, 1.22fr) repeat(11, minmax(70px, 1fr))"
              }
              key={`${accDecDirection}-${isEarlyLateEventPhase ? "earlylate" : "entire"}`}
              onDataTableExport={() => {
                const eventExportFiles = buildEventsExportFilesForAccDecDirection(
                  analysisResults,
                  accDecDirection,
                );
                downloadZip(eventExportFiles, `${accDecDirection}_events_stats.zip`);
              }}
              dataTableRows={eventRowsForAccDecDirection}
            />
          );
        },
      )}
    </div>
  );
}

import DataTable from "../../../components/analysis/DataTable/DataTable";
import { SelectField } from "../../../ui/form/fields/ParamFields";
import { PITCH_ZONE_OPTIONS, ACTIVITY_SCOPE_OPTIONS } from "../../../utils/analysis/constants";
import { buildFilteredSampleStatsExportFile } from "../../../utils/analysis/export/filteredSampleStatsExport";
import { downloadBlob } from "../../../utils/analysis/export/output";
import { hexToRgba } from "../../../utils/analysis/formatters";

import styles from "./FilteredSampleStatsSection.module.css";
export default function FilteredSampleStatsSection({
  analysisViewOptions,
  analysisTableConfig,
  colorMap,
  analysisResults,
}) {
  return (
    <>
      <div className={styles.analysisViewOptionsToolbar}>
        <div className={styles.analysisViewOptionsToolbarFieldsRow}>
          <SelectField
            fieldLabel="Activity scope"
            fieldOptions={ACTIVITY_SCOPE_OPTIONS}
            fieldValue={analysisViewOptions.statsActivityScopeMode}
            isDisabled={false}
            onFieldChange={analysisViewOptions.setStatsActivityScopeMode}
          />
          <SelectField
            fieldLabel="Pitch zone"
            fieldOptions={PITCH_ZONE_OPTIONS}
            fieldValue={analysisViewOptions.pitchZoneMode}
            isDisabled={false}
            onFieldChange={analysisViewOptions.setPitchZoneMode}
          />
        </div>
      </div>

      <DataTable
        dataTableColumns={analysisTableConfig.statsColumns}
        dataTableRows={analysisTableConfig.filteredSampleStatsTableRows}
        dataTableTitle="Filtered GPS data stats"
        getDataTableRowKey={(filteredSampleStatsRow) =>
          `${filteredSampleStatsRow.fileName}-${filteredSampleStatsRow.tableMetricKey}`
        }
        getDataTableRowStyle={(filteredSampleStatsRow) => ({
          background: hexToRgba(colorMap[filteredSampleStatsRow.fileName], 0.1),
        })}
        gridTemplateColumns="minmax(280px, 2fr) repeat(6, minmax(52px, 1fr))"
        onDataTableExport={() => {
          const filteredSampleStatsExportFile = buildFilteredSampleStatsExportFile(analysisResults);
          downloadBlob(
            new Blob([filteredSampleStatsExportFile.content], {
              type: "text/csv;charset=utf-8;",
            }),
            filteredSampleStatsExportFile.name,
          );
        }}
      />
    </>
  );
}

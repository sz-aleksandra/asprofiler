import Button from "../../../ui/Button/Button";
import HeaderLabel from "../../../ui/HeaderLabel/HeaderLabel";

import styles from "./DataTable.module.css";
export default function DataTable({
  dataTableTitle,
  dataTableTitleTooltipText,
  onDataTableExport,
  gridTemplateColumns,
  dataTableColumns,
  dataTableRows,
  getDataTableRowKey,
  getDataTableRowStyle,
}) {
  return (
    <div className={styles.dataTable}>
      <div className={styles.toolbar}>
        <HeaderLabel headerText={dataTableTitle} headerTooltipLines={dataTableTitleTooltipText} />
        {onDataTableExport && (
          <Button type="button" buttonVariant="primary" onClick={onDataTableExport}>
            Export CSV
          </Button>
        )}
      </div>
      <div
        className={`${styles.row} ${styles.headerRow}`}
        style={{
          gridTemplateColumns,
        }}
      >
        {dataTableColumns.map((dataTableColumn) => (
          <span key={dataTableColumn.columnKey}>{dataTableColumn.renderHeader()}</span>
        ))}
      </div>
      {dataTableRows.map((dataTableRow) => (
        <div
          className={styles.row}
          key={getDataTableRowKey(dataTableRow)}
          style={{
            gridTemplateColumns,
            ...getDataTableRowStyle(dataTableRow),
          }}
        >
          {dataTableColumns.map((dataTableColumn) => (
            <span className={styles[dataTableColumn.cellClassName]} key={dataTableColumn.columnKey}>
              {dataTableColumn.renderCell(dataTableRow)}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

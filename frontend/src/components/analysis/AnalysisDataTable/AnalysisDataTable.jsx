import styles from "./AnalysisDataTable.module.css";

export default function AnalysisDataTable({
  title,
  columns,
  rows,
  getRowKey,
  getRowStyle,
  gridTemplateColumns,
}) {
  return (
    <div className={styles.card}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.sectionTitle}>{title}</div>
        </div>
      </div>
      <div className={`${styles.row} ${styles.head}`} style={{ gridTemplateColumns }}>
        {columns.map((column) => (
          <span key={column.key}>
            {column.renderHeader ? column.renderHeader() : column.header}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div
          key={getRowKey(row)}
          className={styles.row}
          style={{
            gridTemplateColumns,
            ...(getRowStyle ? getRowStyle(row) : {}),
          }}
        >
          {columns.map((column) => (
            <span key={column.key} className={column.cellClassName}>
              {column.renderCell(row)}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

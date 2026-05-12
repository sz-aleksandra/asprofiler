import styles from "./AnalysisDataTable.module.css";

export default function AnalysisDataTable({
  title,
  titleTooltipLines,
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
          <div className={styles.sectionTitleWrap}>
            <div className={styles.sectionTitle}>{title}</div>
            {Array.isArray(titleTooltipLines) && titleTooltipLines.length > 0 ? (
              <span className={styles.helpIcon} tabIndex={0}>
                ?
                <span className={styles.helpTooltip}>
                  {titleTooltipLines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </span>
              </span>
            ) : null}
          </div>
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

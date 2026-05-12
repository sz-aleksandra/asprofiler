import styles from "./SelectedPointsTable.module.css";

export default function SelectedPointsTable({
  visibleSelectedPoints,
  filteredSelectedPoints,
  allPointsMarked,
  markedPointMap,
  setMarkedPointMap,
  pointKey,
  selectedVisibleCount,
  pointsBefore,
  setPointsBefore,
  pointsAfter,
  setPointsAfter,
  setSelectedPoints,
  toggleSortRule,
  sortBadge,
  formatSpeedPair,
  formatPointTime,
  formatNumber,
}) {
  return (
    <div className={styles.section}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <label className={styles.selectAll}>
            <input
              type="checkbox"
              checked={allPointsMarked}
              disabled={!visibleSelectedPoints.length}
              onChange={(event) => {
                if (event.target.checked) {
                  setMarkedPointMap((prev) => {
                    const next = { ...prev };
                    visibleSelectedPoints.forEach((point) => {
                      next[pointKey(point)] = true;
                    });
                    return next;
                  });
                  return;
                }
                setMarkedPointMap((prev) => {
                  const next = { ...prev };
                  visibleSelectedPoints.forEach((point) => {
                    delete next[pointKey(point)];
                  });
                  return next;
                });
              }}
            />
            <span>Select all</span>
          </label>
          <span className={styles.count}>
            {visibleSelectedPoints.length} points · {selectedVisibleCount} selected
          </span>
        </div>
        <div className={styles.controls}>
          <label className={styles.label}>
            Points before
            <input
              className={styles.numberInput}
              type="number"
              min={0}
              step={1}
              value={pointsBefore}
              onChange={(event) => setPointsBefore(Math.max(0, Number(event.target.value) || 0))}
            />
          </label>
          <label className={styles.label}>
            Points after
            <input
              className={styles.numberInput}
              type="number"
              min={0}
              step={1}
              value={pointsAfter}
              onChange={(event) => setPointsAfter(Math.max(0, Number(event.target.value) || 0))}
            />
          </label>
          <button
            className={styles.dangerBtn}
            type="button"
            disabled={!selectedVisibleCount}
            onClick={() => {
              const removeKeys = new Set(
                visibleSelectedPoints
                  .filter((point) => markedPointMap[pointKey(point)])
                  .map(pointKey),
              );
              setSelectedPoints((prev) => prev.filter((point) => !removeKeys.has(pointKey(point))));
              setMarkedPointMap((prev) => {
                const next = { ...prev };
                removeKeys.forEach((key) => {
                  delete next[key];
                });
                visibleSelectedPoints.forEach((point) => {
                  delete next[pointKey(point)];
                });
                return next;
              });
            }}
          >
            Delete selected
          </button>
        </div>
      </div>
      <div className={styles.table}>
        <div className={`${styles.row} ${styles.head}`}>
          <div className={styles.cellCheckbox}></div>
          <button
            className={`${styles.sortBtn} ${styles.sortBtnFixed}`}
            type="button"
            onClick={() => toggleSortRule("name")}
          >
            Filename{sortBadge("name") || " ↕"}
          </button>
          <button className={styles.sortBtn} type="button" onClick={() => toggleSortRule("time")}>
            Time{sortBadge("time") || " ↕"}
          </button>
          <button className={styles.sortBtn} type="button" onClick={() => toggleSortRule("speed")}>
            Speed{sortBadge("speed") || " ↕"}
          </button>
          <button
            className={styles.sortBtn}
            type="button"
            onClick={() => toggleSortRule("acceleration")}
          >
            Acceleration{sortBadge("acceleration") || " ↕"}
          </button>
          <div className={styles.actions}></div>
        </div>
        {filteredSelectedPoints.length === 0 && (
          <div className={styles.empty}>No selected points.</div>
        )}
        {filteredSelectedPoints.map((point, pointIndex) => (
          <div className={styles.row} key={`${point.name}-${point.index}-${pointIndex}`}>
            <div className={styles.cellCheckbox}>
              <input
                type="checkbox"
                checked={Boolean(markedPointMap[pointKey(point)])}
                onChange={(event) => {
                  const key = pointKey(point);
                  setMarkedPointMap((prev) => {
                    const next = { ...prev };
                    if (event.target.checked) next[key] = true;
                    else delete next[key];
                    return next;
                  });
                }}
              />
            </div>
            <div className={styles.file}>{point.name}</div>
            <div className={styles.col}>{formatPointTime(point)}</div>
            <div className={styles.col}>{formatSpeedPair(point.speed)}</div>
            <div className={styles.col}>{formatNumber(point.acceleration)}</div>
            <div className={styles.actions}>
              <button
                className={styles.removeBtn}
                type="button"
                onClick={() => {
                  const key = pointKey(point);
                  setSelectedPoints((prev) => prev.filter((p) => pointKey(p) !== key));
                  setMarkedPointMap((prev) => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  });
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

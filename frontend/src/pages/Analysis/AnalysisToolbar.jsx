import styles from "./Analysis.module.css";

export default function AnalysisToolbar({
  visibleSelectedPoints,
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
  filteredSelectedPoints,
  toggleSortRule,
  sortBadge,
  timeMode,
  formatSpeedPair,
  formatPointTime,
  fmt,
}) {
  return (
    <div className={styles.controls}>
      <div className={styles.drawerSection}>
        <div className={styles.drawerSectionTitle}>Selected Points</div>
        <div className={styles.selectionSection}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <label className={styles.selectAll}>
                <input
                  type="checkbox"
                  checked={allPointsMarked}
                  disabled={!visibleSelectedPoints.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setMarkedPointMap((prev) => {
                        const next = { ...prev };
                        visibleSelectedPoints.forEach((p) => {
                          next[pointKey(p)] = true;
                        });
                        return next;
                      });
                      return;
                    }
                    setMarkedPointMap((prev) => {
                      const next = { ...prev };
                      visibleSelectedPoints.forEach((p) => {
                        delete next[pointKey(p)];
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
            <div className={styles.selectionControls}>
              <label className={styles.selectionLabel}>
                Points before
                <input
                  className={styles.selectionInput}
                  type="number"
                  min={0}
                  step={1}
                  value={pointsBefore}
                  onChange={(e) => setPointsBefore(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <label className={styles.selectionLabel}>
                Points after
                <input
                  className={styles.selectionInput}
                  type="number"
                  min={0}
                  step={1}
                  value={pointsAfter}
                  onChange={(e) => setPointsAfter(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <button
                className={styles.selectionDangerBtn}
                type="button"
                disabled={!selectedVisibleCount}
                onClick={() => {
                  const removeKeys = new Set(
                    visibleSelectedPoints.filter((p) => markedPointMap[pointKey(p)]).map(pointKey),
                  );
                  setSelectedPoints((prev) => prev.filter((p) => !removeKeys.has(pointKey(p))));
                  setMarkedPointMap((prev) => {
                    const next = { ...prev };
                    removeKeys.forEach((k) => {
                      delete next[k];
                    });
                    visibleSelectedPoints.forEach((p) => {
                      delete next[pointKey(p)];
                    });
                    return next;
                  });
                }}
              >
                Delete selected
              </button>
            </div>
          </div>
          <div className={styles.selectionTable}>
            <div className={`${styles.row} ${styles.head} ${styles.selectionRow} ${styles.selectionHead}`}>
              <div className={styles.selectionCellCheckbox}></div>
              <button
                className={`${styles.selectionSortBtn} ${styles.selectionSortBtnFixed}`}
                type="button"
                onClick={() => toggleSortRule("name")}
              >
                Filename{sortBadge("name") || " ↕"}
              </button>
              <button className={styles.selectionSortBtn} type="button" onClick={() => toggleSortRule("time")}>
                Time{sortBadge("time") || " ↕"}
              </button>
              <button className={styles.selectionSortBtn} type="button" onClick={() => toggleSortRule("speed")}>
                Speed{sortBadge("speed") || " ↕"}
              </button>
              <button className={styles.selectionSortBtn} type="button" onClick={() => toggleSortRule("accel")}>
                Accel{sortBadge("accel") || " ↕"}
              </button>
              <div className={styles.selectionActions}></div>
            </div>
            {filteredSelectedPoints.length === 0 && (
              <div className={styles.selectionEmpty}>No selected points.</div>
            )}
            {filteredSelectedPoints.map((p, i) => (
              <div className={`${styles.row} ${styles.selectionRow}`} key={`${p.name}-${p.index}-${i}`}>
                <div className={styles.selectionCellCheckbox}>
                  <input
                    type="checkbox"
                    checked={Boolean(markedPointMap[pointKey(p)])}
                    onChange={(e) => {
                      const key = pointKey(p);
                      setMarkedPointMap((prev) => {
                        const next = { ...prev };
                        if (e.target.checked) next[key] = true;
                        else delete next[key];
                        return next;
                      });
                    }}
                  />
                </div>
                <div className={styles.selectionFile}>{p.name}</div>
                <div className={styles.selectionCol}>{formatPointTime(p)}</div>
                <div className={styles.selectionCol}>{formatSpeedPair(p.speed)}</div>
                <div className={styles.selectionCol}>{fmt(p.accel)}</div>
                <div className={styles.selectionActions}>
                  <button
                    className={styles.selectionRemoveBtn}
                    type="button"
                    onClick={() => {
                      const key = pointKey(p);
                      setSelectedPoints((prev) => prev.filter((x) => pointKey(x) !== key));
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
      </div>
    </div>
  );
}

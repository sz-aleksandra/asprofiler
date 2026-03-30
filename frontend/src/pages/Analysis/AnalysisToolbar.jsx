import styles from "./Analysis.module.css";

export default function AnalysisToolbar({
  results,
  allShown,
  shownCount,
  hiddenMap,
  setHiddenMap,
  colorMap,
  colors,
  setColors,
  visibleSelectedPoints,
  allPointsMarked,
  markedPointMap,
  setMarkedPointMap,
  pointKey,
  selectedVisibleCount,
  pointWindow,
  setPointWindow,
  timeWindowSec,
  setTimeWindowSec,
  setSelectedPoints,
  filteredSelectedPoints,
  toggleSortRule,
  sortBadge,
  speedSeriesUnit,
  setSpeedSeriesUnit,
  timeMode,
  setTimeMode,
  formatSpeedPair,
  formatPointTime,
  fmt,
}) {
  return (
    <div className={styles.controls}>
      <div className={styles.drawerSection}>
        <div className={styles.drawerSectionTitle}>Files</div>
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <label className={styles.selectAll}>
              <input
                type="checkbox"
                checked={allShown}
                onChange={(e) => {
                  if (e.target.checked) {
                    setHiddenMap({});
                    return;
                  }
                  const next = {};
                  results.forEach((r) => {
                    next[r.name] = true;
                  });
                  setHiddenMap(next);
                }}
              />
              <span>Show all</span>
            </label>
            <span className={styles.count}>
              {results.length} files · {shownCount} shown
            </span>
          </div>
        </div>
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.toolbarFilesRow} ${styles.head}`}>
            <div className={styles.cellCheckbox}>Show</div>
            <div className={styles.cellName}>Filename</div>
            <div className={styles.cellColor}>Color</div>
          </div>
          {results.map((item) => (
            <div className={`${styles.row} ${styles.toolbarFilesRow}`} key={item.name}>
              <div className={styles.cellCheckbox}>
                <input
                  type="checkbox"
                  checked={!hiddenMap[item.name]}
                  onChange={(e) => {
                    setHiddenMap((prev) => ({
                      ...prev,
                      [item.name]: !e.target.checked,
                    }));
                  }}
                />
              </div>
              <div className={styles.cellName}>{item.name}</div>
              <div className={styles.cellColor}>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={colorMap[item.name]}
                  onChange={(e) => {
                    setColors((prev) => ({ ...prev, [item.name]: e.target.value }));
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.drawerSection}>
        <div className={styles.drawerSectionTitle}>Display</div>
        <div className={styles.toolbar}>
          <div className={styles.selectionControls}>
            <label className={styles.selectionLabel}>
              Speed chart
              <select
                className={styles.selectionSelect}
                value={speedSeriesUnit}
                onChange={(e) => setSpeedSeriesUnit(e.target.value)}
              >
                <option value="m/s">m/s</option>
                <option value="km/h">km/h</option>
              </select>
            </label>
            <label className={styles.selectionLabel}>
              Time display
              <select
                className={styles.selectionSelect}
                value={timeMode}
                onChange={(e) => setTimeMode(e.target.value)}
              >
                <option value="relative">Relative</option>
                <option value="absolute">Absolute</option>
              </select>
            </label>
          </div>
        </div>
      </div>

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
                +/- points
                <input
                  className={styles.selectionInput}
                  type="number"
                  min={0}
                  step={1}
                  value={pointWindow}
                  onChange={(e) => setPointWindow(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <label className={styles.selectionLabel}>
                +/- seconds
                <input
                  className={styles.selectionInput}
                  type="number"
                  min={0}
                  step={0.1}
                  value={timeWindowSec}
                  onChange={(e) => setTimeWindowSec(Math.max(0, Number(e.target.value) || 0))}
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
                Time{timeMode === "absolute" ? " abs." : ""}{sortBadge("time") || " ↕"}
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

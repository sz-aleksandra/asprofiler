import SelectedPointsTable from "../SelectedPointsTable/SelectedPointsTable";
import { formatNumber, formatSpeedPair } from "../../../utils/analysis/analysisFormatters";

import styles from "./AnalysisSidebar.module.css";

export default function AnalysisSidebar({
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
  formatPointTime,
}) {
  return (
    <div className={styles.controls}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Selected Points</div>
        <SelectedPointsTable
          visibleSelectedPoints={visibleSelectedPoints}
          filteredSelectedPoints={filteredSelectedPoints}
          allPointsMarked={allPointsMarked}
          markedPointMap={markedPointMap}
          setMarkedPointMap={setMarkedPointMap}
          pointKey={pointKey}
          selectedVisibleCount={selectedVisibleCount}
          pointsBefore={pointsBefore}
          setPointsBefore={setPointsBefore}
          pointsAfter={pointsAfter}
          setPointsAfter={setPointsAfter}
          setSelectedPoints={setSelectedPoints}
          toggleSortRule={toggleSortRule}
          sortBadge={sortBadge}
          formatSpeedPair={formatSpeedPair}
          formatPointTime={formatPointTime}
          formatNumber={formatNumber}
        />
      </div>
    </div>
  );
}

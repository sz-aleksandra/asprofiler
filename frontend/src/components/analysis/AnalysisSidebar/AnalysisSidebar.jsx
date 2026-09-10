import ChosenAnalysisPointsTable from "../ChosenAnalysisPointsTable/ChosenAnalysisPointsTable";

import styles from "./AnalysisSidebar.module.css";
export default function AnalysisSidebar({
  isOpen,
  onCloseAnalysisSidebar,
  chosenAnalysisPointsTableState,
  formatChosenAnalysisPointTimeLabel,
}) {
  if (!isOpen) return null;
  return (
    <>
      <div
        className={styles.analysisSidebarOverlay}
        data-testid="sidebar-overlay"
        onClick={onCloseAnalysisSidebar}
      />
      <div className={styles.analysisSidebarPanel}>
        <h2 className={styles.analysisSidebarTitle}>Selected Points</h2>
        <ChosenAnalysisPointsTable
          chosenAnalysisPointsTableState={chosenAnalysisPointsTableState}
          formatChosenAnalysisPointTimeLabel={formatChosenAnalysisPointTimeLabel}
        />
      </div>
    </>
  );
}

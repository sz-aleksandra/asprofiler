import { NavLink, useLocation } from "react-router-dom";

import { useAnalysisSidebarOpen } from "../../../hooks/shared/useAnalysisSidebarOpen";
import Button from "../../../ui/Button/Button";
import Brand from "../Brand/Brand";

import styles from "./Header.module.css";
function getTabClassName({ isActive: isTabActive }) {
  return `${styles.navTab} ${isTabActive ? styles.navTabActive : ""}`;
}
export default function Header() {
  const location = useLocation();
  const showAnalysisSidebarButton = location.pathname === "/analysis";
  const { isAnalysisSidebarOpen, setIsAnalysisSidebarOpen } = useAnalysisSidebarOpen();
  const isAnalysisSidebarButtonActive = showAnalysisSidebarButton && isAnalysisSidebarOpen;
  return (
    <div className={styles.header}>
      <div
        className={`${styles.bar} ${isAnalysisSidebarButtonActive ? styles.barShiftedWithAnalysisSidebar : ""}`}
      >
        <Brand />

        <div className={styles.navTabs}>
          <NavLink className={getTabClassName} to="/about">
            About
          </NavLink>
          <NavLink className={getTabClassName} to="/files">
            Files
          </NavLink>
        </div>

        {showAnalysisSidebarButton && (
          <Button
            type="button"
            buttonVariant={isAnalysisSidebarButtonActive ? "primary" : "primaryOutline"}
            onClick={() => setIsAnalysisSidebarOpen((isOpen) => !isOpen)}
          >
            Sidebar
          </Button>
        )}
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAnalysisLayout } from "../Layout/AnalysisLayoutContext";
import styles from "./Header.module.css";

export default function Header() {
  const location = useLocation();
  const showToolbarButton = /^\/analyses\/[^/]+$/.test(location.pathname);
  const { analysisToolsOpen, setAnalysisToolsOpen } = useAnalysisLayout();
  const toolbarOpen = showToolbarButton && analysisToolsOpen;

  useEffect(() => {
    if (!showToolbarButton) setAnalysisToolsOpen(false);
  }, [showToolbarButton, setAnalysisToolsOpen]);

  return (
    <header className={styles.header}>
      <div
        className={`${styles.inner} ${toolbarOpen && showToolbarButton ? styles.innerShifted : ""}`}
      >
        <div className={styles.brand}>
          <span className={styles.accent}>AS</span>
          Profiler
        </div>

        <nav className={styles.tabs}>
          <NavLink
            to="/about"
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ""}`}
          >
            About
          </NavLink>
          <NavLink
            to="/files"
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ""}`}
          >
            Files
          </NavLink>
          <NavLink
            to="/analyses"
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ""}`}
          >
            Analyses
          </NavLink>
        </nav>

        {showToolbarButton && (
          <button
            className={toolbarOpen ? styles.toolbarBtnActive : styles.toolbarBtn}
            type="button"
            onClick={() => setAnalysisToolsOpen((open) => !open)}
          >
            Toolbar
          </button>
        )}
      </div>
    </header>
  );
}

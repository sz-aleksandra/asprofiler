import { useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import AspChart from "../../components/AspChart/AspChart";
import AspChartCombined from "../../components/AspChartCombined/AspChartCombined";

import styles from "./Analysis.module.css";

export default function Analysis() {
  const location = useLocation();
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem("analysis_view_mode");
    return saved === "separate" ? "separate" : "combined";
  });

  const analysis = useMemo(() => {
    const state = location.state;
    if (state && state.results) return state.results;
    const raw = localStorage.getItem("analysis_results");
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }, [location.state]);

  useEffect(() => {
    localStorage.setItem("analysis_view_mode", viewMode);
  }, [viewMode]);

  if (analysis.length === 0) {
    return (
      <section className={styles.page}>
        <h1 className={styles.title}>Analysis</h1>
        <div className={styles.empty}>No analysis data yet.</div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Analysis</h1>

      <div className={styles.viewToggle}>
        <button
          className={viewMode === "combined" ? styles.toggleActive : styles.toggle}
          onClick={() => setViewMode("combined")}
          type="button"
        >
          Combined
        </button>
        <button
          className={viewMode === "separate" ? styles.toggleActive : styles.toggle}
          onClick={() => setViewMode("separate")}
          type="button"
        >
          Separate
        </button>
      </div>

      {viewMode === "combined" ? (
        <AspChartCombined profiles={analysis} title="ASP Chart (Combined)" />
      ) : (
        analysis.map((item) => (
          <AspChart key={item.name} profile={item.profile} title={`ASP: ${item.name}`} />
        ))
      )}
    </section>
  );
}

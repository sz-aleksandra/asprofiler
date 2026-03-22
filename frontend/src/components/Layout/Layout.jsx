import { useState } from "react";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import { Outlet } from "react-router-dom";
import { AnalysisLayoutContext } from "./AnalysisLayoutContext";
import styles from "./Layout.module.css";

export default function Layout() {
  const [analysisToolsOpen, setAnalysisToolsOpen] = useState(false);

  return (
    <AnalysisLayoutContext.Provider value={{ analysisToolsOpen, setAnalysisToolsOpen }}>
      <div className={styles.shell}>
        <Header />
        <main className={styles.content}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </AnalysisLayoutContext.Provider>
  );
}

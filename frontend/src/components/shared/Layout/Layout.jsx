import { useState } from "react";
import { Outlet } from "react-router-dom";

import { AnalysisSidebarOpenContext } from "../../../hooks/shared/useAnalysisSidebarOpen";
import Footer from "../Footer/Footer";
import Header from "../Header/Header";

import styles from "./Layout.module.css";

export default function Layout() {
  const [isAnalysisSidebarOpen, setIsAnalysisSidebarOpen] = useState(false);

  return (
    <AnalysisSidebarOpenContext.Provider
      value={{ isAnalysisSidebarOpen, setIsAnalysisSidebarOpen }}
    >
      <div className={styles.layout}>
        <Header />
        <div className={styles.outlet}>
          <Outlet />
        </div>
        <Footer />
      </div>
    </AnalysisSidebarOpenContext.Provider>
  );
}

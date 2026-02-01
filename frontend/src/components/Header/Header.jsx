import { NavLink } from "react-router-dom";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
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
            to="/upload"
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ""}`}
          >
            Upload Files
          </NavLink>
          <NavLink
            to="/files"
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ""}`}
          >
            Files List
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

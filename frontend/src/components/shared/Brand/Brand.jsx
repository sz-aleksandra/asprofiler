import styles from "./Brand.module.css";

export default function Brand() {
  return (
    <div className={styles.brand}>
      <span className={styles.accent}>AS</span>
      Profiler
    </div>
  );
}

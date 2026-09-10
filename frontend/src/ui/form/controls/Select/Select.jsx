import styles from "./Select.module.css";

export default function Select({ children, ...selectProps }) {
  return (
    <select className={styles.select} {...selectProps}>
      {children}
    </select>
  );
}

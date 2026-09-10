import styles from "./Checkbox.module.css";

export default function Checkbox(checkboxProps) {
  return <input type="checkbox" className={styles.checkbox} {...checkboxProps} />;
}

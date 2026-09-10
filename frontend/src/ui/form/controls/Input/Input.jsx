import styles from "./Input.module.css";

export default function Input({ inputWidth, ...inputProps }) {
  return (
    <input
      className={styles.input}
      style={inputWidth != null ? { width: inputWidth, minWidth: inputWidth } : undefined}
      {...inputProps}
    />
  );
}

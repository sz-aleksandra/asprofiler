import styles from "./ColorInput.module.css";
export default function ColorInput(colorInputProps) {
  return <input type="color" className={styles.colorInput} {...colorInputProps} />;
}

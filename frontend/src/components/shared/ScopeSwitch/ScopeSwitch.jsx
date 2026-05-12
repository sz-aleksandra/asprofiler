import styles from "./ScopeSwitch.module.css";

export default function ScopeSwitch({ label, value, onChange, options, disabled }) {
  return (
    <label className={styles.label}>
      {label}
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

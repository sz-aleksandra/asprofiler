import styles from "./GroupedControl.module.css";

const SPEED_OPTIONS = [
  { value: "m/s", label: "m/s" },
  { value: "km/h", label: "km/h" },
];

export default function GroupedInput({
  value,
  onChange,
  selectValue,
  onSelectChange,
  options = SPEED_OPTIONS,
  disabled = false,
  inputDisabled,
  selectDisabled,
  type = "number",
  min,
  max,
  step,
  inputAriaLabel,
  selectAriaLabel,
}) {
  const resolvedInputDisabled = inputDisabled ?? disabled;
  const resolvedSelectDisabled = selectDisabled ?? disabled;
  return (
    <div className={styles.group}>
      <input
        className={styles.input}
        type={type}
        value={value}
        onChange={onChange}
        disabled={resolvedInputDisabled}
        min={min}
        max={max}
        step={step}
        aria-label={inputAriaLabel}
      />
      <select
        className={styles.select}
        value={selectValue}
        onChange={onSelectChange}
        disabled={resolvedSelectDisabled}
        aria-label={selectAriaLabel}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

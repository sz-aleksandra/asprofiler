import styles from "./GroupedInput.module.css";
export default function GroupedInput({ isDisabled, inputProps, selectProps, selectOptions }) {
  return (
    <div className={styles.groupedInput}>
      <input className={styles.numberValueInput} disabled={isDisabled} {...inputProps} />
      <select className={styles.unitSelect} disabled={isDisabled} {...selectProps}>
        {selectOptions.map((selectOption) => (
          <option key={selectOption.value} value={selectOption.value}>
            {selectOption.label}
          </option>
        ))}
      </select>
    </div>
  );
}

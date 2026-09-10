import { kmhToMPerS, mPerSToKmh } from "../../../utils/shared/conversions";
import HeaderLabel from "../../HeaderLabel/HeaderLabel";
import ColorInput from "../controls/ColorInput/ColorInput";
import GroupedInput from "../controls/GroupedInput/GroupedInput";
import Input from "../controls/Input/Input";
import Select from "../controls/Select/Select";

import styles from "./ParamFields.module.css";
const SPEED_UNIT_OPTIONS = [
  {
    value: "m/s",
    label: "m/s",
  },
  {
    value: "km/h",
    label: "km/h",
  },
];
function ParamFieldLabel({ tooltipText, fieldLabel }) {
  if (!tooltipText) return fieldLabel;
  return <HeaderLabel headerText={fieldLabel} headerTooltipLines={[tooltipText]} />;
}
export function NumericField({
  fieldLabel,
  tooltipText,
  fieldValue,
  onFieldChange,
  parseInputValue,
  isDisabled,
  inputWidth,
  inputMin,
  inputMax,
  inputStep,
}) {
  return (
    <label className={styles.paramFieldLabel}>
      <ParamFieldLabel fieldLabel={fieldLabel} tooltipText={tooltipText} />
      <Input
        type="number"
        disabled={isDisabled}
        inputWidth={inputWidth}
        max={inputMax}
        min={inputMin}
        onChange={(changeEvent) => onFieldChange(parseInputValue(changeEvent.target.value))}
        step={inputStep}
        value={fieldValue}
      />
    </label>
  );
}
export function SpeedField({
  fieldLabel,
  fieldValue,
  onFieldChange,
  parseInputValue,
  speedUnit,
  onSpeedUnitChange,
  isDisabled,
  inputMin,
  inputStep,
}) {
  return (
    <label className={styles.paramFieldLabel}>
      {fieldLabel}
      <GroupedInput
        inputProps={{
          type: "number",
          value: speedUnit === "km/h" ? mPerSToKmh(fieldValue) : Number(fieldValue),
          onChange: (changeEvent) => {
            const speedValue = Number(changeEvent.target.value);
            onFieldChange(
              parseInputValue(speedUnit === "km/h" ? kmhToMPerS(speedValue) : speedValue),
            );
          },
          min: inputMin,
          step: inputStep,
        }}
        isDisabled={isDisabled}
        selectProps={{
          value: speedUnit,
          onChange: (changeEvent) => onSpeedUnitChange(changeEvent.target.value),
        }}
        selectOptions={SPEED_UNIT_OPTIONS}
      />
    </label>
  );
}
export function SelectField({ fieldLabel, fieldValue, onFieldChange, isDisabled, fieldOptions }) {
  return (
    <label className={styles.paramFieldLabel}>
      {fieldLabel}
      <Select
        disabled={isDisabled}
        onChange={(changeEvent) => onFieldChange(changeEvent.target.value)}
        value={fieldValue}
      >
        {fieldOptions.map((selectOption) => (
          <option key={selectOption.value} value={selectOption.value}>
            {selectOption.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
export function ParamField({ fieldProps, fieldDef }) {
  const {
    fieldValues,
    onFieldChange,
    isDisabled,
    eventSpeedUnit,
    profilingSpeedUnit,
    setEventSpeedUnit,
    setProfilingSpeedUnit,
  } = fieldProps;
  const commonParamFieldProps = {
    fieldLabel: fieldDef.fieldLabel,
    tooltipText: fieldDef.tooltipText,
    fieldValue: fieldValues[fieldDef.key],
    onFieldChange: (fieldValue) => onFieldChange(fieldDef.key, fieldValue),
    parseInputValue: fieldDef.parse,
    isDisabled,
    inputStep: fieldDef.step,
  };
  if (fieldDef.type === "speed") {
    const isEventSpeedField = fieldDef.speedUnitType === "event";
    return (
      <SpeedField
        {...commonParamFieldProps}
        inputMin={fieldDef.min}
        onSpeedUnitChange={isEventSpeedField ? setEventSpeedUnit : setProfilingSpeedUnit}
        speedUnit={isEventSpeedField ? eventSpeedUnit : profilingSpeedUnit}
      />
    );
  }
  if (fieldDef.type === "select") {
    return <SelectField {...commonParamFieldProps} fieldOptions={fieldDef.options} />;
  }
  return (
    <NumericField {...commonParamFieldProps} inputMax={fieldDef.max} inputMin={fieldDef.min} />
  );
}
export function ColorField({ fieldLabel, fieldValue, onFieldChange, isDisabled }) {
  return (
    <label className={styles.paramFieldLabel}>
      {fieldLabel}
      <ColorInput
        disabled={isDisabled}
        onChange={(changeEvent) => onFieldChange(changeEvent.target.value)}
        value={fieldValue}
      />
    </label>
  );
}

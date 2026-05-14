import GroupedInput from "../../../ui/form/controls/GroupedInput/GroupedInput";
import Input from "../../../ui/form/controls/Input/Input";
import { metersPerSecondToKmh } from "../../../utils/shared/unitConversions";

import styles from "./PerFileParametersPanel.module.css";

function toDisplaySpeed(value, unit) {
  return unit === "km/h" ? metersPerSecondToKmh(value) : Number(value);
}

function fromDisplaySpeed(value, unit) {
  return unit === "km/h" ? Number(value) / 3.6 : Number(value);
}

export default function PerFileParametersPanel({
  fileName,
  defaultColor,
  selectedColor,
  onColorChange,
  perFileParameters,
  parametersByFile,
  setParametersByFile,
  profilingSpeedUnit,
  onProfilingSpeedUnitChange,
  disabled = false,
}) {
  const updateParametersByFile = (nextParameters) => {
    setParametersByFile(nextParameters);
    localStorage.setItem("analysis_params_map", JSON.stringify(nextParameters));
  };

  return (
    <div className={styles.panel}>
      <label className={styles.label}>
        Color
        <input
          className={styles.colorInput}
          type="color"
          value={selectedColor || defaultColor}
          onChange={(event) => onColorChange(event.target.value)}
          disabled={disabled}
        />
      </label>
      <label className={styles.label}>
        Body mass (kg)
        <Input
          type="number"
          min="1"
          step="0.1"
          value={perFileParameters.body_mass_kg}
          onChange={(event) => {
            const nextParametersByFile = {
              ...parametersByFile,
              [fileName]: {
                ...perFileParameters,
                body_mass_kg: Math.max(1, Number(event.target.value) || 1),
              },
            };
            updateParametersByFile(nextParametersByFile);
          }}
          disabled={disabled}
        />
      </label>
      <label className={styles.label}>
        Minimum acceleration speed
        <GroupedInput
          value={toDisplaySpeed(perFileParameters.min_speed, profilingSpeedUnit)}
          onChange={(event) => {
            const nextParametersByFile = {
              ...parametersByFile,
              [fileName]: {
                ...perFileParameters,
                min_speed: fromDisplaySpeed(event.target.value, profilingSpeedUnit),
              },
            };
            updateParametersByFile(nextParametersByFile);
          }}
          selectValue={profilingSpeedUnit}
          onSelectChange={(event) => onProfilingSpeedUnitChange(event.target.value)}
          disabled={disabled}
          step="0.1"
          inputAriaLabel={`Minimum acceleration speed for ${fileName}`}
          selectAriaLabel={`Minimum acceleration speed unit for ${fileName}`}
        />
      </label>
      <label className={styles.label}>
        Minimum deceleration speed
        <GroupedInput
          value={toDisplaySpeed(perFileParameters.deceleration_min_speed, profilingSpeedUnit)}
          onChange={(event) => {
            const nextParametersByFile = {
              ...parametersByFile,
              [fileName]: {
                ...perFileParameters,
                deceleration_min_speed: fromDisplaySpeed(event.target.value, profilingSpeedUnit),
              },
            };
            updateParametersByFile(nextParametersByFile);
          }}
          selectValue={profilingSpeedUnit}
          onSelectChange={(event) => onProfilingSpeedUnitChange(event.target.value)}
          disabled={disabled}
          step="0.1"
          inputAriaLabel={`Minimum deceleration speed for ${fileName}`}
          selectAriaLabel={`Minimum deceleration speed unit for ${fileName}`}
        />
      </label>
    </div>
  );
}

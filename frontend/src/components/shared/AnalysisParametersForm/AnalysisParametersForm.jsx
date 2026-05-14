import GroupedInput from "../../../ui/form/controls/GroupedInput/GroupedInput";
import Input from "../../../ui/form/controls/Input/Input";
import Select from "../../../ui/form/controls/Select/Select";
import { metersPerSecondToKmh } from "../../../utils/shared/unitConversions";

import styles from "./AnalysisParametersForm.module.css";

function toDisplaySpeed(value, unit) {
  return unit === "km/h" ? metersPerSecondToKmh(value) : Number(value);
}

function fromDisplaySpeed(value, unit) {
  return unit === "km/h" ? Number(value) / 3.6 : Number(value);
}

export default function AnalysisParametersForm({
  analysisParameters,
  preprocessingParameters,
  profilingSpeedUnit,
  onProfilingSpeedUnitChange,
  eventSpeedUnit,
  onEventSpeedUnitChange,
  onAnalysisParameterChange,
  onPreprocessingParameterChange,
  defaultColor,
  onDefaultColorChange,
  showDefaultColor = false,
  disabled = false,
}) {
  return (
    <div className={styles.form}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Filtering parameters</div>
        <div className={styles.selectionControls}>
          <label className={styles.selectionLabel}>
            Filter type
            <Select
              value={preprocessingParameters.filter_mode}
              onChange={(event) =>
                onPreprocessingParameterChange?.("filter_mode", event.target.value)
              }
              disabled={disabled}
            >
              <option value="none">None</option>
              <option value="median">Median</option>
              <option value="mean">Mean</option>
              <option value="median_mean">Median to Mean</option>
              <option value="butterworth">Butterworth (4th order, 2 Hz)</option>
            </Select>
          </label>
          <label className={styles.selectionLabel}>
            Filter window
            <Input
              type="number"
              min="1"
              step="1"
              value={preprocessingParameters.filter_window}
              onChange={(event) =>
                onPreprocessingParameterChange?.(
                  "filter_window",
                  Math.max(1, Math.floor(Number(event.target.value) || 1)),
                )
              }
              disabled={
                disabled ||
                preprocessingParameters.filter_mode === "none" ||
                preprocessingParameters.filter_mode === "butterworth"
              }
            />
          </label>
          <label className={styles.selectionLabel}>
            <span className={styles.statsHeadWithHelp}>
              <span>Maximum horizontal accuracy (m)</span>
              <span className={styles.helpIcon} tabIndex={0}>
                ?
                <span className={styles.helpTooltip}>
                  <span>Horizontal accuracy = estimated horizontal position error in meters.</span>
                </span>
              </span>
            </span>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={preprocessingParameters.maximum_horizontal_accuracy_meters}
              onChange={(event) =>
                onPreprocessingParameterChange?.(
                  "maximum_horizontal_accuracy_meters",
                  Math.max(0, Number(event.target.value) || 0),
                )
              }
              disabled={disabled}
            />
          </label>
          <label className={styles.selectionLabel}>
            <span className={styles.statsHeadWithHelp}>
              <span>Maximum horizontal dilution of precision</span>
              <span className={styles.helpIcon} tabIndex={0}>
                ?
                <span className={styles.helpTooltip}>
                  <span>
                    Horizontal dilution of precision = lower values mean better satellite geometry.
                  </span>
                </span>
              </span>
            </span>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={preprocessingParameters.maximum_horizontal_dilution_of_precision}
              onChange={(event) =>
                onPreprocessingParameterChange?.(
                  "maximum_horizontal_dilution_of_precision",
                  Math.max(0, Number(event.target.value) || 0),
                )
              }
              disabled={disabled}
            />
          </label>
          <label className={styles.selectionLabel}>
            Minimum satellites
            <Input
              type="number"
              min="0"
              step="1"
              value={preprocessingParameters.minimum_satellites}
              onChange={(event) =>
                onPreprocessingParameterChange?.(
                  "minimum_satellites",
                  Math.max(0, Math.floor(Number(event.target.value) || 0)),
                )
              }
              disabled={disabled}
            />
          </label>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Profiling parameters</div>
        <div className={styles.selectionControls}>
          <label className={styles.selectionLabel}>
            Minimum acceleration speed
            <GroupedInput
              value={toDisplaySpeed(analysisParameters.min_speed, profilingSpeedUnit)}
              onChange={(event) =>
                onAnalysisParameterChange?.(
                  "min_speed",
                  fromDisplaySpeed(event.target.value, profilingSpeedUnit),
                )
              }
              selectValue={profilingSpeedUnit}
              onSelectChange={(event) => onProfilingSpeedUnitChange?.(event.target.value)}
              disabled={disabled}
              step="0.1"
              inputAriaLabel="Minimum acceleration speed"
              selectAriaLabel="Minimum acceleration speed unit"
            />
          </label>
          <label className={styles.selectionLabel}>
            Minimum deceleration speed
            <GroupedInput
              value={toDisplaySpeed(analysisParameters.deceleration_min_speed, profilingSpeedUnit)}
              onChange={(event) =>
                onAnalysisParameterChange?.(
                  "deceleration_min_speed",
                  fromDisplaySpeed(event.target.value, profilingSpeedUnit),
                )
              }
              selectValue={profilingSpeedUnit}
              onSelectChange={(event) => onProfilingSpeedUnitChange?.(event.target.value)}
              disabled={disabled}
              step="0.1"
              inputAriaLabel="Minimum deceleration speed"
              selectAriaLabel="Minimum deceleration speed unit"
            />
          </label>
          <label className={styles.selectionLabel}>
            Bin size (m/s)
            <Input
              type="number"
              step="0.1"
              value={analysisParameters.bin_size}
              onChange={(event) =>
                onAnalysisParameterChange?.("bin_size", Number(event.target.value))
              }
              disabled={disabled}
            />
          </label>
          <label className={styles.selectionLabel}>
            Top points per bin
            <Input
              type="number"
              min="1"
              step="1"
              value={analysisParameters.extreme_n}
              onChange={(event) =>
                onAnalysisParameterChange?.(
                  "extreme_n",
                  Math.max(1, Math.floor(Number(event.target.value) || 1)),
                )
              }
              disabled={disabled}
            />
          </label>
          <label className={styles.selectionLabel}>
            Confidence level
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max="0.999"
              value={analysisParameters.confidence_level}
              onChange={(event) =>
                onAnalysisParameterChange?.("confidence_level", Number(event.target.value))
              }
              disabled={disabled}
            />
          </label>
          <label className={styles.selectionLabel}>
            Body mass (kg)
            <Input
              type="number"
              min="1"
              step="0.1"
              value={analysisParameters.body_mass_kg}
              onChange={(event) =>
                onAnalysisParameterChange?.(
                  "body_mass_kg",
                  Math.max(1, Number(event.target.value) || 1),
                )
              }
              disabled={disabled}
            />
          </label>
          {showDefaultColor && defaultColor ? (
            <label className={styles.selectionLabel}>
              Default color
              <input
                className={styles.colorInput}
                type="color"
                value={defaultColor}
                onChange={(event) => onDefaultColorChange?.(event.target.value)}
                disabled={disabled}
              />
            </label>
          ) : null}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Event parameters</div>
        <div className={styles.selectionControls}>
          <label className={styles.selectionLabel}>
            Minimum acceleration for event start (m/s²)
            <Input
              type="number"
              min="0.1"
              step="0.1"
              value={analysisParameters.minimum_acceleration_for_event_start}
              onChange={(event) =>
                onAnalysisParameterChange?.(
                  "minimum_acceleration_for_event_start",
                  Math.max(0.1, Number(event.target.value) || 0.1),
                )
              }
              disabled={disabled}
            />
          </label>
          <label className={styles.selectionLabel}>
            Minimum deceleration for event start (m/s²)
            <Input
              type="number"
              max="-0.1"
              step="0.1"
              value={analysisParameters.minimum_deceleration_for_event_start}
              onChange={(event) =>
                onAnalysisParameterChange?.(
                  "minimum_deceleration_for_event_start",
                  Math.min(-0.1, Number(event.target.value) || -0.1),
                )
              }
              disabled={disabled}
            />
          </label>
          <label className={styles.selectionLabel}>
            Minimum event duration (s)
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={analysisParameters.minimum_event_duration_seconds}
              onChange={(event) =>
                onAnalysisParameterChange?.(
                  "minimum_event_duration_seconds",
                  Math.max(0.01, Number(event.target.value) || 0.01),
                )
              }
              disabled={disabled}
            />
          </label>
          <label className={styles.selectionLabel}>
            Minimum high-speed running duration (s)
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={analysisParameters.minimum_high_speed_running_duration_seconds}
              onChange={(event) =>
                onAnalysisParameterChange?.(
                  "minimum_high_speed_running_duration_seconds",
                  Math.max(0.01, Number(event.target.value) || 0.01),
                )
              }
              disabled={disabled}
            />
          </label>
          <label className={styles.selectionLabel}>
            Minimum high-speed running speed
            <GroupedInput
              value={toDisplaySpeed(
                analysisParameters.minimum_high_speed_running_speed_meters_per_second,
                eventSpeedUnit,
              )}
              onChange={(event) =>
                onAnalysisParameterChange?.(
                  "minimum_high_speed_running_speed_meters_per_second",
                  Math.max(0.1, fromDisplaySpeed(event.target.value, eventSpeedUnit) || 0.1),
                )
              }
              selectValue={eventSpeedUnit}
              onSelectChange={(event) => onEventSpeedUnitChange?.(event.target.value)}
              disabled={disabled}
              min="0.1"
              step="0.1"
              inputAriaLabel="Minimum high-speed running speed"
              selectAriaLabel="Minimum high-speed running speed unit"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

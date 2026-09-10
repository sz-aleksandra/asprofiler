import { ColorField, ParamField } from "../../../ui/form/fields/ParamFields";
import {
  CSV_FILTER_PARAM_FIELDS,
  EVENT_PARAM_FIELDS,
  PREPROCESSING_PARAM_FIELDS,
  PROFILING_PARAM_FIELDS,
} from "../../../utils/shared/constants";

import styles from "./AnalysisParamsForm.module.css";
function AnalysisParamsFormSection({ paramsFormSectionTitle, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{paramsFormSectionTitle}</div>
      <div className={styles.fieldsRow}>{children}</div>
    </div>
  );
}
export default function AnalysisParamsForm({
  analysisParams,
  onAnalysisParamChange,
  isDisabled,
  speedUnitsState,
  csvFilterParams,
  onCsvFilterParamChange,
  preprocessingParams,
  onPreprocessingParamChange,
  defaultColor,
  onDefaultColorChange,
}) {
  const analysisParamsFieldProps = {
    fieldValues: analysisParams,
    onFieldChange: onAnalysisParamChange,
    isDisabled,
    ...speedUnitsState,
  };
  const csvFilterParamsFieldProps = {
    fieldValues: csvFilterParams,
    onFieldChange: onCsvFilterParamChange,
    isDisabled,
    ...speedUnitsState,
  };
  const preprocessingParamsFieldProps = {
    fieldValues: preprocessingParams,
    onFieldChange: onPreprocessingParamChange,
    isDisabled,
    ...speedUnitsState,
  };
  return (
    <div className={styles.analysisParamsForm}>
      <AnalysisParamsFormSection paramsFormSectionTitle="CSV filter">
        {CSV_FILTER_PARAM_FIELDS.map((csvFilterParamField) => (
          <ParamField
            fieldDef={csvFilterParamField}
            fieldProps={csvFilterParamsFieldProps}
            key={csvFilterParamField.key}
          />
        ))}
      </AnalysisParamsFormSection>

      <AnalysisParamsFormSection paramsFormSectionTitle="Preprocessing parameters">
        {PREPROCESSING_PARAM_FIELDS.map((preprocessingParamField) => (
          <ParamField
            fieldDef={preprocessingParamField}
            fieldProps={{
              ...preprocessingParamsFieldProps,
              isDisabled:
                isDisabled ||
                (preprocessingParamField.key === "filter_window_samples" &&
                  ["none", "butterworth"].includes(preprocessingParams.filter_mode)),
            }}
            key={preprocessingParamField.key}
          />
        ))}
      </AnalysisParamsFormSection>

      <AnalysisParamsFormSection paramsFormSectionTitle="Profiling parameters">
        {PROFILING_PARAM_FIELDS.map((profilingParamField) => (
          <ParamField
            fieldDef={profilingParamField}
            fieldProps={analysisParamsFieldProps}
            key={profilingParamField.key}
          />
        ))}
        {defaultColor ? (
          <ColorField
            fieldLabel="Default color"
            fieldValue={defaultColor}
            isDisabled={isDisabled}
            onFieldChange={onDefaultColorChange}
          />
        ) : null}
      </AnalysisParamsFormSection>

      <AnalysisParamsFormSection paramsFormSectionTitle="Event parameters">
        {EVENT_PARAM_FIELDS.map((eventParamField) => (
          <ParamField
            fieldDef={eventParamField}
            fieldProps={analysisParamsFieldProps}
            key={eventParamField.key}
          />
        ))}
      </AnalysisParamsFormSection>
    </div>
  );
}

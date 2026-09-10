import { ColorField, ParamField } from "../../../ui/form/fields/ParamFields";
import { PER_SELECTED_FILE_PARAM_FIELDS } from "../../../utils/shared/constants";

import styles from "./PerSelectedFileAnalysisParamsForm.module.css";
export default function PerSelectedFileAnalysisParamsForm({
  perSelectedFileParams,
  onSelectedFileParamChange,
  isDisabled,
  speedUnitsState,
  selectedFileColor,
  onSelectedFileColorChange,
}) {
  const perSelectedFileParamFieldProps = {
    fieldValues: perSelectedFileParams,
    onFieldChange: onSelectedFileParamChange,
    isDisabled,
    ...speedUnitsState,
  };
  return (
    <div className={styles.perSelectedFileAnalysisParamsFormPanel}>
      <ColorField
        fieldLabel="Color"
        fieldValue={selectedFileColor}
        isDisabled={isDisabled}
        onFieldChange={onSelectedFileColorChange}
      />
      {PER_SELECTED_FILE_PARAM_FIELDS.map((perSelectedFileParamField) => (
        <ParamField
          fieldDef={perSelectedFileParamField}
          fieldProps={perSelectedFileParamFieldProps}
          key={perSelectedFileParamField.key}
        />
      ))}
    </div>
  );
}

import Button from "../../../ui/Button/Button";
import Checkbox from "../../../ui/form/controls/Checkbox/Checkbox";
import ColorInput from "../../../ui/form/controls/ColorInput/ColorInput";
import HeaderLabel from "../../../ui/HeaderLabel/HeaderLabel";
import { buildAnalysisProfileExportFiles } from "../../../utils/analysis/export/accDecDirectionAnalysisProfileExport";
import { downloadZip } from "../../../utils/analysis/export/output";
import {
  formatToTwoDecimalPlaces,
  formatSpeedPair,
  hexToRgba,
} from "../../../utils/analysis/formatters";
import { buildAccDecDirectionAnalysisProfileFitHeaders } from "../../../utils/analysis/tables/config";

import styles from "./AccDecDirectionAnalysisProfileTable.module.css";
export default function AccDecDirectionAnalysisProfileTable({
  areAllAccDecDirectionAnalysisProfilesShown,
  onToggleAllAccDecDirectionAnalysisProfileSelection,
  accDecDirectionAnalysisProfileTableRows,
  analysisResultsForAnalysisProfileExport,
  analysisProfileConfig,
  onToggleAccDecDirectionAnalysisProfileSelection,
  onAnalysisProfileColorChange,
}) {
  return (
    <div className={styles.accDecDirectionAnalysisProfileTable}>
      <div className={styles.tableSelectionToolbar}>
        <label className={styles.allToggle}>
          <Checkbox
            checked={areAllAccDecDirectionAnalysisProfilesShown}
            onChange={(changeEvent) =>
              onToggleAllAccDecDirectionAnalysisProfileSelection(changeEvent.target.checked)
            }
          />
          <span>Show all</span>
        </label>
        <Button
          type="button"
          buttonVariant="primary"
          onClick={() =>
            downloadZip(
              buildAnalysisProfileExportFiles(analysisResultsForAnalysisProfileExport),
              "acc_dec_profile_points_fit.zip",
            )
          }
        >
          Export CSV
        </Button>
      </div>
      <div className={`${styles.row} ${styles.headerRow}`}>
        <div className={styles.checkboxCell} />
        <div className={styles.fileNameCell}>File name</div>
        <div className={styles.metricCell}>Analysis Profile</div>
        <div className={styles.fitCell}>Analysis Profile Equation</div>
        {buildAccDecDirectionAnalysisProfileFitHeaders(analysisProfileConfig).map(
          (accDecDirectionAnalysisProfileFitHeader) => (
            <div
              className={styles.metricCell}
              key={
                accDecDirectionAnalysisProfileFitHeader.accDecDirectionAnalysisProfileFitHeaderLabel
              }
            >
              <HeaderLabel
                headerText={
                  accDecDirectionAnalysisProfileFitHeader.accDecDirectionAnalysisProfileFitHeaderLabel
                }
                headerTooltipLines={
                  accDecDirectionAnalysisProfileFitHeader.accDecDirectionAnalysisProfileFitTooltipText
                }
              />
            </div>
          ),
        )}
        <div className={styles.metricCell}>Body mass</div>
        <div className={styles.colorCell}>Color</div>
      </div>
      {accDecDirectionAnalysisProfileTableRows.map((accDecDirectionAnalysisProfileRow) => {
        const accDecDirectionAnalysisProfileScale =
          accDecDirectionAnalysisProfileRow.accDecDirectionMultiplier *
          (analysisProfileConfig.isForce ? accDecDirectionAnalysisProfileRow.bodyMass : 1);
        const formatAccDecDirectionAnalysisProfileFitCell = (
          formatAccDecDirectionAnalysisProfileFit,
        ) =>
          accDecDirectionAnalysisProfileRow.accDecDirectionAnalysisProfileFit
            ? formatAccDecDirectionAnalysisProfileFit(
                accDecDirectionAnalysisProfileRow.accDecDirectionAnalysisProfileFit,
              )
            : "-";
        const accDecDirectionAnalysisProfileInterceptText =
          accDecDirectionAnalysisProfileRow.accDecDirectionAnalysisProfileFit
            ? formatToTwoDecimalPlaces(
                accDecDirectionAnalysisProfileRow.accDecDirectionAnalysisProfileFit.intercept *
                  accDecDirectionAnalysisProfileScale,
              )
            : "-";
        return (
          <div
            className={styles.row}
            key={accDecDirectionAnalysisProfileRow.key}
            style={{
              background: hexToRgba(accDecDirectionAnalysisProfileRow.color, 0.1),
            }}
          >
            <div className={styles.checkboxCell}>
              <Checkbox
                checked={!accDecDirectionAnalysisProfileRow.isHidden}
                onChange={(toggleAccDecDirectionAnalysisProfileChangeEvent) =>
                  onToggleAccDecDirectionAnalysisProfileSelection(
                    accDecDirectionAnalysisProfileRow,
                    toggleAccDecDirectionAnalysisProfileChangeEvent.target.checked,
                  )
                }
              />
            </div>
            <div className={styles.fileNameCell}>{accDecDirectionAnalysisProfileRow.fileName}</div>
            <div className={styles.metricCell}>
              {accDecDirectionAnalysisProfileRow.accDecDirectionLabel}
            </div>
            <div className={styles.fitCell}>
              {formatAccDecDirectionAnalysisProfileFitCell(
                (accDecDirectionAnalysisProfileFit) =>
                  `${analysisProfileConfig.equationSymbol} = ${accDecDirectionAnalysisProfileInterceptText} + (${formatToTwoDecimalPlaces(accDecDirectionAnalysisProfileFit.slope * accDecDirectionAnalysisProfileScale)}) · v`,
              )}
            </div>
            <div className={styles.metricCell}>
              {accDecDirectionAnalysisProfileRow.accDecDirectionAnalysisProfileFit
                ? `${accDecDirectionAnalysisProfileInterceptText} ${analysisProfileConfig.metricUnit}`
                : "-"}
            </div>
            <div className={styles.metricCell}>
              {formatAccDecDirectionAnalysisProfileFitCell((accDecDirectionAnalysisProfileFit) =>
                accDecDirectionAnalysisProfileFit.zero_crossing_speed !== null
                  ? formatSpeedPair(accDecDirectionAnalysisProfileFit.zero_crossing_speed)
                  : "-",
              )}
            </div>
            <div className={styles.metricCell}>
              {formatAccDecDirectionAnalysisProfileFitCell((accDecDirectionAnalysisProfileFit) =>
                formatToTwoDecimalPlaces(accDecDirectionAnalysisProfileFit.r_squared),
              )}
            </div>
            <div
              className={styles.metricCell}
            >{`${formatToTwoDecimalPlaces(accDecDirectionAnalysisProfileRow.bodyMass)} kg`}</div>
            <div className={styles.colorCell}>
              <ColorInput
                onChange={(colorChangeEvent) =>
                  onAnalysisProfileColorChange(
                    accDecDirectionAnalysisProfileRow,
                    colorChangeEvent.target.value,
                  )
                }
                value={accDecDirectionAnalysisProfileRow.color}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

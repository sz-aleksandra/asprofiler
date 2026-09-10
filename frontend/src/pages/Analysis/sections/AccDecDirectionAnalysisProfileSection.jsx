import AccDecDirectionAnalysisProfileChart from "../../../components/analysis/AccDecDirectionAnalysisProfileChart/AccDecDirectionAnalysisProfileChart";
import AccDecDirectionAnalysisProfileTable from "../../../components/analysis/AccDecDirectionAnalysisProfileTable/AccDecDirectionAnalysisProfileTable";
import { SelectField } from "../../../ui/form/fields/ParamFields";
import {
  ACC_DEC_DIRECTION_CONFIGS,
  ANALYSIS_PROFILE_MODE_OPTIONS,
} from "../../../utils/analysis/constants";
import { buildAccDecDirectionAnalysisProfileTableRows } from "../../../utils/analysis/tables/rows";

import styles from "./AccDecDirectionAnalysisProfileSection.module.css";
export default function AccDecDirectionAnalysisProfileSection({
  analysisResults,
  analysisResultColorsAndVisibility,
  analysisViewOptions,
  analysisViewModel,
  analysisProfileConfig,
  chosenAnalysisPointsTableState,
}) {
  const accDecDirectionAnalysisProfileTableRows = buildAccDecDirectionAnalysisProfileTableRows({
    analysisResults,
    colorMap: analysisResultColorsAndVisibility.colorMap,
    isAccDecDirectionHidden: analysisResultColorsAndVisibility.isAccDecDirectionHidden,
  });
  return (
    <>
      <div className={styles.analysisViewOptionsToolbar}>
        <div className={styles.analysisViewOptionsToolbarFieldsRow}>
          <SelectField
            fieldLabel="Analysis Profile mode"
            fieldOptions={ANALYSIS_PROFILE_MODE_OPTIONS}
            fieldValue={analysisViewOptions.analysisProfileMode}
            isDisabled={false}
            onFieldChange={analysisViewOptions.setAnalysisProfileMode}
          />
        </div>
      </div>

      <AccDecDirectionAnalysisProfileTable
        accDecDirectionAnalysisProfileTableRows={accDecDirectionAnalysisProfileTableRows}
        analysisProfileConfig={analysisProfileConfig}
        analysisResultsForAnalysisProfileExport={analysisResults}
        areAllAccDecDirectionAnalysisProfilesShown={
          analysisViewModel.areAllAccDecDirectionAnalysisProfilesShown
        }
        onAnalysisProfileColorChange={(accDecDirectionAnalysisProfileRow, analysisProfileColor) =>
          analysisResultColorsAndVisibility.setColorForFile(
            accDecDirectionAnalysisProfileRow.fileName,
            analysisProfileColor,
          )
        }
        onToggleAccDecDirectionAnalysisProfileSelection={(
          accDecDirectionAnalysisProfileRow,
          shouldShow,
        ) =>
          analysisResultColorsAndVisibility.setAccDecDirectionVisibility(
            accDecDirectionAnalysisProfileRow.fileName,
            accDecDirectionAnalysisProfileRow.accDecDirection,
            !shouldShow,
          )
        }
        onToggleAllAccDecDirectionAnalysisProfileSelection={(shouldShowAll) =>
          shouldShowAll
            ? analysisResultColorsAndVisibility.showAllAccDecDirections()
            : analysisResultColorsAndVisibility.hideAllAccDecDirections()
        }
        visibleAccDecDirectionAnalysisProfilesCount={
          analysisViewModel.visibleAccDecDirectionAnalysisProfilesCount
        }
      />

      {analysisViewModel.visibleAnalysisResults.length > 0 &&
        ACC_DEC_DIRECTION_CONFIGS.map(
          ({ accDecDirection, accDecDirectionLabel, accDecDirectionMultiplier }) => {
            const accDecDirectionAnalysisProfiles =
              analysisViewModel.accDecDirectionAnalysisProfiles[accDecDirection];
            if (!accDecDirectionAnalysisProfiles.length) return null;
            const accDecDirectionAnalysisProfileChartTitle = `${accDecDirectionLabel}${analysisProfileConfig.chartTitleSuffix}`;
            const accDecDirectionAnalysisProfileChartYAxisTitle = analysisProfileConfig.isForce
              ? "Force (N)"
              : `${accDecDirectionLabel} (m/s²)`;
            return (
              <AccDecDirectionAnalysisProfileChart
                accDecDirectionAnalysisProfileChartTitle={accDecDirectionAnalysisProfileChartTitle}
                accDecDirectionAnalysisProfileChartYAxisTitle={
                  accDecDirectionAnalysisProfileChartYAxisTitle
                }
                accDecDirectionAnalysisProfiles={accDecDirectionAnalysisProfiles}
                accDecDirectionMultiplier={accDecDirectionMultiplier}
                analysisProfileConfig={analysisProfileConfig}
                chosenAnalysisPointsState={
                  chosenAnalysisPointsTableState.chosenAnalysisPointsListState
                }
                colorMap={analysisResultColorsAndVisibility.colorMap}
                key={accDecDirection}
              />
            );
          },
        )}
    </>
  );
}

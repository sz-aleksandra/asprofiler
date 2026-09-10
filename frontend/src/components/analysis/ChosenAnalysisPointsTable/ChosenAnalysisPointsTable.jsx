import Button from "../../../ui/Button/Button";
import Checkbox from "../../../ui/form/controls/Checkbox/Checkbox";
import { NumericField } from "../../../ui/form/fields/ParamFields";
import { SORT_COLUMNS } from "../../../utils/analysis/constants";
import { formatToTwoDecimalPlaces, formatSpeedPair } from "../../../utils/analysis/formatters";
import { atLeast } from "../../../utils/shared/constants";

import styles from "./ChosenAnalysisPointsTable.module.css";
export default function ChosenAnalysisPointsTable({
  chosenAnalysisPointsTableState,
  formatChosenAnalysisPointTimeLabel,
}) {
  const {
    chosenAnalysisPointsListState,
    selectedChosenAnalysisPointsState,
    chosenAnalysisPointsSortState,
  } = chosenAnalysisPointsTableState;
  const {
    chosenAnalysisPoints,
    beforeChosenAnalysisPointsCount,
    setBeforeChosenAnalysisPointsCount,
    afterChosenAnalysisPointsCount,
    setAfterChosenAnalysisPointsCount,
    removeChosenAnalysisPoint,
  } = chosenAnalysisPointsListState;
  const {
    areAllChosenAnalysisPointsSelected,
    onToggleAllChosenAnalysisPointsSelection,
    selectedChosenAnalysisPointsCount,
    removeSelectedChosenAnalysisPoints,
    selectedChosenAnalysisPointMap,
    onToggleChosenAnalysisPointSelection,
  } = selectedChosenAnalysisPointsState;
  const {
    chosenAnalysisPointsSortRules,
    onToggleChosenAnalysisPointsSortRule,
    sortedChosenAnalysisPoints,
  } = chosenAnalysisPointsSortState;
  const sortRuleIndexByColumnKey = new Map(
    chosenAnalysisPointsSortRules.map((sortRule, sortRuleIndex) => [
      sortRule.sortKey,
      sortRuleIndex,
    ]),
  );
  return (
    <div className={styles.chosenAnalysisPointsTable}>
      <div className={styles.tableSelectionToolbar}>
        <label className={styles.allToggle}>
          <Checkbox
            checked={areAllChosenAnalysisPointsSelected}
            disabled={!chosenAnalysisPoints.length}
            onChange={(changeEvent) =>
              onToggleAllChosenAnalysisPointsSelection(changeEvent.target.checked)
            }
          />
          <span>Select all</span>
        </label>
        <div className={styles.controls}>
          <NumericField
            fieldLabel="Points before"
            fieldValue={beforeChosenAnalysisPointsCount}
            inputMin={0}
            inputWidth={72}
            onFieldChange={setBeforeChosenAnalysisPointsCount}
            parseInputValue={atLeast(0)}
          />
          <NumericField
            fieldLabel="Points after"
            fieldValue={afterChosenAnalysisPointsCount}
            inputMin={0}
            inputWidth={72}
            onFieldChange={setAfterChosenAnalysisPointsCount}
            parseInputValue={atLeast(0)}
          />
          <Button
            type="button"
            buttonVariant="primary"
            disabled={!selectedChosenAnalysisPointsCount}
            onClick={removeSelectedChosenAnalysisPoints}
          >
            Delete selected
          </Button>
        </div>
      </div>
      <div className={styles.rows}>
        <div className={`${styles.row} ${styles.headerRow}`}>
          <div className={styles.checkboxCell} />
          {SORT_COLUMNS.map(({ columnKey, columnLabel }) => {
            const sortRuleIndex = sortRuleIndexByColumnKey.get(columnKey) ?? -1;
            const chosenAnalysisPointsSortBadge =
              sortRuleIndex === -1
                ? ""
                : ` ${chosenAnalysisPointsSortRules[sortRuleIndex].sortDirection}(${sortRuleIndex + 1})`;
            return (
              <Button
                type="button"
                buttonClassName={styles.sortButton}
                buttonVariant="ghost"
                key={columnKey}
                onClick={() => onToggleChosenAnalysisPointsSortRule(columnKey)}
              >
                {columnLabel}
                {chosenAnalysisPointsSortBadge || " sort"}
              </Button>
            );
          })}
          <div className={styles.actionsCell} />
        </div>
        {sortedChosenAnalysisPoints.length === 0 && (
          <div className={styles.emptyMessage}>No selected points.</div>
        )}
        {sortedChosenAnalysisPoints.map((sortedChosenAnalysisPoint) => {
          const sortedChosenAnalysisPointKey = `${sortedChosenAnalysisPoint.fileName}::${sortedChosenAnalysisPoint.timeSeriesIndex}`;
          return (
            <div className={styles.row} key={sortedChosenAnalysisPointKey}>
              <div className={styles.checkboxCell}>
                <Checkbox
                  checked={!!selectedChosenAnalysisPointMap[sortedChosenAnalysisPointKey]}
                  onChange={(chosenAnalysisPointChangeEvent) =>
                    onToggleChosenAnalysisPointSelection(
                      sortedChosenAnalysisPoint,
                      chosenAnalysisPointChangeEvent.target.checked,
                    )
                  }
                />
              </div>
              <div className={styles.fileNameCell}>{sortedChosenAnalysisPoint.fileName}</div>
              <div className={styles.valueCell}>
                {formatChosenAnalysisPointTimeLabel(sortedChosenAnalysisPoint)}
              </div>
              <div className={styles.valueCell}>
                {formatSpeedPair(sortedChosenAnalysisPoint.speed)}
              </div>
              <div className={styles.valueCell}>
                {formatToTwoDecimalPlaces(sortedChosenAnalysisPoint.metricValue)}
              </div>
              <div className={styles.actionsCell}>
                <Button
                  type="button"
                  buttonVariant="primary"
                  onClick={() => removeChosenAnalysisPoint(sortedChosenAnalysisPoint)}
                >
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

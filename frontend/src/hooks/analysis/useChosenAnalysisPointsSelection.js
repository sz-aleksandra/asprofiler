import { useState } from "react";

import { getNextSortRules, sortPoints } from "../../utils/analysis/formatters";

function getChosenAnalysisPointKey(chosenAnalysisPoint) {
  return `${chosenAnalysisPoint.fileName}::${chosenAnalysisPoint.timeSeriesIndex}`;
}

export default function useChosenAnalysisPointsSelection(visibleAnalysisResults) {
  const [allChosenAnalysisPoints, setAllChosenAnalysisPoints] = useState([]);
  const [selectedChosenAnalysisPointMap, setSelectedChosenAnalysisPointMap] = useState({});
  const [beforeChosenAnalysisPointsCount, setBeforeChosenAnalysisPointsCount] = useState(10);
  const [afterChosenAnalysisPointsCount, setAfterChosenAnalysisPointsCount] = useState(10);
  const [chosenAnalysisPointsSortRules, setChosenAnalysisPointsSortRules] = useState([]);

  const visibleAnalysisResultFileNames = new Set(
    visibleAnalysisResults.map((visibleAnalysisResult) => visibleAnalysisResult.file_name),
  );
  const visibleChosenAnalysisPoints = allChosenAnalysisPoints.filter((chosenAnalysisPoint) =>
    visibleAnalysisResultFileNames.has(chosenAnalysisPoint.fileName),
  );
  const selectedChosenAnalysisPointsCount = visibleChosenAnalysisPoints.filter(
    (chosenAnalysisPoint) =>
      selectedChosenAnalysisPointMap[getChosenAnalysisPointKey(chosenAnalysisPoint)],
  ).length;

  const setChosenAnalysisPointSelection = (chosenAnalysisPointKeys, isSelected) => {
    setSelectedChosenAnalysisPointMap((previousSelectedChosenAnalysisPointMap) => {
      const nextSelectedChosenAnalysisPointMap = {
        ...previousSelectedChosenAnalysisPointMap,
      };
      chosenAnalysisPointKeys.forEach((chosenAnalysisPointKey) => {
        if (isSelected) nextSelectedChosenAnalysisPointMap[chosenAnalysisPointKey] = true;
        else delete nextSelectedChosenAnalysisPointMap[chosenAnalysisPointKey];
      });
      return nextSelectedChosenAnalysisPointMap;
    });
  };

  const removeChosenAnalysisPointsByKeys = (chosenAnalysisPointKeysToRemove) => {
    const chosenAnalysisPointKeysToRemoveSet = new Set(chosenAnalysisPointKeysToRemove);
    setAllChosenAnalysisPoints((previousChosenAnalysisPoints) =>
      previousChosenAnalysisPoints.filter(
        (previousChosenAnalysisPoint) =>
          !chosenAnalysisPointKeysToRemoveSet.has(
            getChosenAnalysisPointKey(previousChosenAnalysisPoint),
          ),
      ),
    );
    setChosenAnalysisPointSelection(chosenAnalysisPointKeysToRemove, false);
  };

  return {
    chosenAnalysisPointsListState: {
      chosenAnalysisPoints: visibleChosenAnalysisPoints,
      beforeChosenAnalysisPointsCount,
      setBeforeChosenAnalysisPointsCount,
      afterChosenAnalysisPointsCount,
      setAfterChosenAnalysisPointsCount,
      onChooseAnalysisPoint: (analysisPointToChoose) => {
        const chosenAnalysisPointKey = getChosenAnalysisPointKey(analysisPointToChoose);
        setAllChosenAnalysisPoints((previousChosenAnalysisPoints) =>
          previousChosenAnalysisPoints.some(
            (previousChosenAnalysisPoint) =>
              getChosenAnalysisPointKey(previousChosenAnalysisPoint) === chosenAnalysisPointKey,
          )
            ? previousChosenAnalysisPoints.filter(
                (previousChosenAnalysisPoint) =>
                  getChosenAnalysisPointKey(previousChosenAnalysisPoint) !== chosenAnalysisPointKey,
              )
            : [...previousChosenAnalysisPoints, analysisPointToChoose],
        );
        setChosenAnalysisPointSelection([chosenAnalysisPointKey], false);
      },
      onChooseAnalysisPoints: (analysisPointsToChoose) => {
        setAllChosenAnalysisPoints((previousChosenAnalysisPoints) => {
          const existingChosenAnalysisPointKeys = new Set(
            previousChosenAnalysisPoints.map(getChosenAnalysisPointKey),
          );
          const newChosenAnalysisPointsByKey = new Map();
          analysisPointsToChoose.forEach((analysisPointToChoose) => {
            const chosenAnalysisPointKey = getChosenAnalysisPointKey(analysisPointToChoose);
            if (
              !existingChosenAnalysisPointKeys.has(chosenAnalysisPointKey) &&
              !newChosenAnalysisPointsByKey.has(chosenAnalysisPointKey)
            ) {
              newChosenAnalysisPointsByKey.set(chosenAnalysisPointKey, analysisPointToChoose);
            }
          });
          return newChosenAnalysisPointsByKey.size
            ? [...previousChosenAnalysisPoints, ...newChosenAnalysisPointsByKey.values()]
            : previousChosenAnalysisPoints;
        });
      },
      removeChosenAnalysisPoint: (chosenAnalysisPointToRemove) =>
        removeChosenAnalysisPointsByKeys([getChosenAnalysisPointKey(chosenAnalysisPointToRemove)]),
    },
    selectedChosenAnalysisPointsState: {
      selectedChosenAnalysisPointMap,
      selectedChosenAnalysisPointsCount,
      areAllChosenAnalysisPointsSelected:
        visibleChosenAnalysisPoints.length > 0 &&
        selectedChosenAnalysisPointsCount === visibleChosenAnalysisPoints.length,
      onToggleChosenAnalysisPointSelection: (chosenAnalysisPoint, isSelected) =>
        setChosenAnalysisPointSelection(
          [getChosenAnalysisPointKey(chosenAnalysisPoint)],
          isSelected,
        ),
      onToggleAllChosenAnalysisPointsSelection: (isSelected) =>
        setChosenAnalysisPointSelection(
          visibleChosenAnalysisPoints.map(getChosenAnalysisPointKey),
          isSelected,
        ),
      removeSelectedChosenAnalysisPoints: () =>
        removeChosenAnalysisPointsByKeys(
          visibleChosenAnalysisPoints
            .map(getChosenAnalysisPointKey)
            .filter(
              (chosenAnalysisPointKey) => selectedChosenAnalysisPointMap[chosenAnalysisPointKey],
            ),
        ),
    },
    chosenAnalysisPointsSortState: {
      chosenAnalysisPointsSortRules,
      sortedChosenAnalysisPoints: sortPoints(
        visibleChosenAnalysisPoints,
        chosenAnalysisPointsSortRules,
      ),
      onToggleChosenAnalysisPointsSortRule: (sortKey) =>
        setChosenAnalysisPointsSortRules((previousChosenAnalysisPointsSortRules) =>
          getNextSortRules(previousChosenAnalysisPointsSortRules, sortKey),
        ),
    },
  };
}

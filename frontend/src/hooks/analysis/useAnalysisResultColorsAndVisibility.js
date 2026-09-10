import { useState } from "react";

import { ACC_DEC_DIRECTIONS } from "../../utils/analysis/constants";

export default function useAnalysisResultColorsAndVisibility(analysisResults, initialColorMap) {
  const [colorOverrideMap, setColorOverrideMap] = useState({});
  const [hiddenMap, setHiddenMap] = useState({});

  return {
    colorMap: Object.fromEntries(
      analysisResults.map((analysisResult) => [
        analysisResult.file_name,
        colorOverrideMap[analysisResult.file_name] ?? initialColorMap[analysisResult.file_name],
      ]),
    ),
    isAccDecDirectionHidden: (fileName, accDecDirection) =>
      !!hiddenMap[`${fileName}::${accDecDirection}`],
    setColorForFile: (fileName, fileColor) =>
      setColorOverrideMap((previousColorOverrideMap) => ({
        ...previousColorOverrideMap,
        [fileName]: fileColor,
      })),
    setAccDecDirectionVisibility: (fileName, accDecDirection, isHidden) =>
      setHiddenMap((previousHiddenMap) => ({
        ...previousHiddenMap,
        [`${fileName}::${accDecDirection}`]: isHidden,
      })),
    showAllAccDecDirections: () => setHiddenMap({}),
    hideAllAccDecDirections: () =>
      setHiddenMap(
        Object.fromEntries(
          analysisResults.flatMap((analysisResult) =>
            ACC_DEC_DIRECTIONS.map((accDecDirection) => [
              `${analysisResult.file_name}::${accDecDirection}`,
              true,
            ]),
          ),
        ),
      ),
  };
}

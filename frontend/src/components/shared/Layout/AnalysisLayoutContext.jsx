import { createContext, useContext } from "react";

export const AnalysisLayoutContext = createContext({
  analysisToolsOpen: false,
  setAnalysisToolsOpen: () => {},
});

export function useAnalysisLayout() {
  return useContext(AnalysisLayoutContext);
}

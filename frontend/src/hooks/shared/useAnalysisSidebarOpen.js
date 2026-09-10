import { createContext, useContext } from "react";

export const AnalysisSidebarOpenContext = createContext(null);

export function useAnalysisSidebarOpen() {
  return useContext(AnalysisSidebarOpenContext);
}

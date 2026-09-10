import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { AnalysisSidebarOpenContext, useAnalysisSidebarOpen } from "./useAnalysisSidebarOpen";

describe("useAnalysisSidebarOpen", () => {
  it("returns null when used outside a provider", () => {
    const { result } = renderHook(() => useAnalysisSidebarOpen());
    expect(result.current).toBeNull();
  });

  it("returns the value supplied by AnalysisSidebarOpenContext.Provider", () => {
    const analysisSidebarOpenContextValue = {
      isAnalysisSidebarOpen: true,
      setIsAnalysisSidebarOpen: () => {},
    };
    const { result } = renderHook(() => useAnalysisSidebarOpen(), {
      wrapper: ({ children }) => (
        <AnalysisSidebarOpenContext.Provider value={analysisSidebarOpenContextValue}>
          {children}
        </AnalysisSidebarOpenContext.Provider>
      ),
    });
    expect(result.current).toBe(analysisSidebarOpenContextValue);
  });
});

import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import useSession from "./useSession";

vi.mock("../../api/authApi", () => ({
  getSessionStatus: vi.fn(),
}));

const { getSessionStatus } = await import("../../api/authApi");

beforeEach(() => {
  getSessionStatus.mockReset();
});

describe("useSession", () => {
  it("starts in the loading state with defaults", () => {
    getSessionStatus.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSession());
    expect(result.current.isSessionLoading).toBe(true);
    expect(result.current.isSessionAuthenticated).toBe(false);
    expect(result.current.getSessionErrorMessage).toBeNull();
  });

  it("resolves with either authenticated true or false", async () => {
    for (const authenticated of [true, false]) {
      getSessionStatus.mockReset();
      getSessionStatus.mockResolvedValue({ authenticated });
      const { result } = renderHook(() => useSession());
      await waitFor(() => expect(result.current.isSessionLoading).toBe(false));
      expect(result.current.isSessionAuthenticated).toBe(authenticated);
      expect(result.current.getSessionErrorMessage).toBeNull();
    }
  });

  it("sets error message when the request rejects", async () => {
    getSessionStatus.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.isSessionLoading).toBe(false));
    expect(result.current.isSessionAuthenticated).toBe(false);
    expect(result.current.getSessionErrorMessage).toBe("Could not connect to the backend.");
  });
});

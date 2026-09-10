import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";

import useLocalStorage, { readLocalStorage } from "./useLocalStorage";

beforeEach(() => {
  localStorage.clear();
});

describe("readLocalStorage", () => {
  it("returns parsed stored value or falls back to default across missing/invalid/present cases", () => {
    const readCases = [
      [null, "fallback", "fallback"],
      ["{not json", "fallback", "fallback"],
      [JSON.stringify({ nested: 1 }), null, { nested: 1 }],
      ["null", "fallback", null],
    ];
    for (const [storedRawValue, defaultValue, expectedValue] of readCases) {
      localStorage.clear();
      if (storedRawValue !== null) localStorage.setItem("localStorageKey", storedRawValue);
      expect(readLocalStorage("localStorageKey", defaultValue)).toEqual(expectedValue);
    }
  });

  it("invokes function default lazily when no stored value", () => {
    expect(readLocalStorage("localStorageKey", () => ({ lazyDefault: true }))).toEqual({
      lazyDefault: true,
    });
  });
});

describe("useLocalStorage", () => {
  it("initialises from the stored value when present", () => {
    localStorage.setItem("localStorageKey", JSON.stringify({ previousValue: 42 }));
    const { result } = renderHook(() => useLocalStorage("localStorageKey", null));
    expect(result.current[0]).toEqual({ previousValue: 42 });
  });

  it("persists a direct next value to localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("localStorageKey", 0));
    act(() => result.current[1](7));
    expect(result.current[0]).toBe(7);
    expect(JSON.parse(localStorage.getItem("localStorageKey"))).toBe(7);
  });

  it("persists an updater-function result to localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("localStorageKey", 10));
    act(() => result.current[1]((previousValue) => previousValue + 5));
    expect(result.current[0]).toBe(15);
    expect(JSON.parse(localStorage.getItem("localStorageKey"))).toBe(15);
  });

  it("swallows setItem errors and still updates in-memory state", () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("quota");
    };
    try {
      const { result } = renderHook(() => useLocalStorage("localStorageKey", 0));
      act(() => result.current[1](99));
      expect(result.current[0]).toBe(99);
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
  });
});

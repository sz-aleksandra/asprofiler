import { useState } from "react";

export function readLocalStorage(localStorageKey, defaultValue) {
  try {
    const storedValue = localStorage.getItem(localStorageKey);
    if (storedValue !== null) return JSON.parse(storedValue);
  } catch {
    // localStorage unavailable
  }
  return typeof defaultValue === "function" ? defaultValue() : defaultValue;
}

export default function useLocalStorage(localStorageKey, defaultValue) {
  const [value, setValue] = useState(() => readLocalStorage(localStorageKey, defaultValue));

  const setStoredValue = (valueOrUpdater) => {
    setValue((previousValue) => {
      const nextValue =
        typeof valueOrUpdater === "function" ? valueOrUpdater(previousValue) : valueOrUpdater;
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(nextValue));
      } catch {
        // localStorage unavailable
      }
      return nextValue;
    });
  };

  return [value, setStoredValue];
}

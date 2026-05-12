from __future__ import annotations

import numpy as np


def stats(values: np.ndarray) -> dict:
    if len(values) == 0:
        return {"min": None, "mean": None, "median": None, "max": None}
    return {
        "min": float(np.min(values)),
        "mean": float(np.mean(values)),
        "median": float(np.median(values)),
        "max": float(np.max(values)),
    }


def curve_area(times: np.ndarray, values: np.ndarray, absolute: bool = False) -> float:
    if len(times) < 2 or len(values) < 2:
        return 0.0
    integrated_values = np.abs(values) if absolute else values
    return float(np.trapz(integrated_values, x=times))

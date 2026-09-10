from __future__ import annotations

import numpy as np


def summarize_stats(values: np.ndarray):
    if len(values) == 0:
        return {"min": None, "mean": None, "median": None, "max": None}
    return {
        "min": float(np.min(values)),
        "mean": float(np.mean(values)),
        "median": float(np.median(values)),
        "max": float(np.max(values)),
    }


def compute_curve_area(times: np.ndarray, values: np.ndarray):
    return float(np.trapezoid(values, x=times))

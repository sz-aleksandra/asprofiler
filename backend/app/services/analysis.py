import csv
import math
from statistics import NormalDist

import numpy as np
from fastapi import HTTPException

from app.models import AnalyzeParams


def load_series_stream(
    stream,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, list[str] | None, list[float | None] | None, list[float | None] | None, int]:
    speeds = []
    accels = []
    times = []
    absolute_times = []
    latitudes = []
    longitudes = []
    total_rows = 0
    reader = csv.DictReader(stream)
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="Missing CSV header")
    field_map = {name.strip().lower(): name for name in reader.fieldnames}
    if (
        "time" not in field_map
        or "speed" not in field_map
        or "acceleration" not in field_map
    ):
        raise HTTPException(
            status_code=400,
            detail="CSV must contain time, speed, acceleration columns",
        )
    time_col = field_map["time"]
    absolute_time_col = field_map.get("absolute_time")
    speed_col = field_map["speed"]
    accel_col = field_map["acceleration"]
    lat_col = field_map.get("lat")
    lon_col = field_map.get("lon")
    for row in reader:
        total_rows += 1
        try:
            t_raw = row.get(time_col, "")
            s_raw = row.get(speed_col, "")
            a_raw = row.get(accel_col, "")
            if t_raw is None or s_raw is None or a_raw is None:
                continue
            t = float(str(t_raw).strip())
            s = float(str(s_raw).strip())
            a = float(str(a_raw).strip())
        except (ValueError, TypeError):
            continue
        if math.isnan(t) or math.isnan(s) or math.isnan(a):
            continue
        speeds.append(s)
        accels.append(a)
        times.append(t)
        if absolute_time_col:
            absolute_times.append(str(row.get(absolute_time_col, "") or "").strip())
        if lat_col:
            lat_raw = row.get(lat_col, "")
            try:
                latitudes.append(float(str(lat_raw).strip()))
            except (ValueError, TypeError):
                latitudes.append(None)
        if lon_col:
            lon_raw = row.get(lon_col, "")
            try:
                longitudes.append(float(str(lon_raw).strip()))
            except (ValueError, TypeError):
                longitudes.append(None)

    if not speeds:
        raise HTTPException(status_code=400, detail="No valid speed/accel rows found")

    return (
        np.array(times, dtype=float),
        np.array(speeds, dtype=float),
        np.array(accels, dtype=float),
        absolute_times if absolute_time_col else None,
        latitudes if lat_col and len(latitudes) == len(times) else None,
        longitudes if lon_col and len(longitudes) == len(times) else None,
        total_rows,
    )


def _select_points(
    speeds: np.ndarray,
    accels: np.ndarray,
    min_speed: float,
    bin_size: float,
    top_n: int,
    positive_only: bool,
) -> tuple[np.ndarray, np.ndarray]:
    mask = speeds >= min_speed
    if positive_only:
        mask = mask & (accels > 0)
    if not np.any(mask):
        return np.array([]), np.array([])

    s = speeds[mask]
    a = accels[mask]

    max_speed = float(np.max(s))

    bins = []
    start = float(min_speed)
    end = max_speed + bin_size

    current = start
    while current < end:
        bins.append((current, current + bin_size))
        current += bin_size

    picked_s = []
    picked_a = []
    for lo, hi in bins:
        idx = (s >= lo) & (s < hi)
        if not np.any(idx):
            continue
        s_bin = s[idx]
        a_bin = a[idx]
        order = np.argsort(a_bin)[::-1]
        take = order[:top_n]
        for i in take:
            picked_s.append(float(s_bin[i]))
            picked_a.append(float(a_bin[i]))

    return np.array(picked_s, dtype=float), np.array(picked_a, dtype=float)


def _fit_line(x: np.ndarray, y: np.ndarray) -> tuple[float, float]:
    if len(x) < 2:
        raise ValueError("Not enough points to fit")
    slope, intercept = np.polyfit(x, y, 1)
    return float(intercept), float(slope)


def _r2(y: np.ndarray, y_hat: np.ndarray) -> float:
    ss_res = float(np.sum((y - y_hat) ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    if ss_tot == 0:
        return 0.0
    return 1.0 - (ss_res / ss_tot)


def _apply_ci_filter(
    x: np.ndarray,
    y: np.ndarray,
    intercept: float,
    slope: float,
    ci_z: float,
) -> tuple[np.ndarray, np.ndarray]:
    y_hat = intercept + slope * x
    n = len(x)
    if n <= 2:
        return x, y
    residuals = y - y_hat
    sigma = float(np.sqrt(np.sum(residuals**2) / (n - 2)))
    if sigma == 0:
        return x, y
    keep = np.abs(residuals) <= (ci_z * sigma)
    if not np.any(keep):
        return x, y
    return x[keep], y[keep]


def _stats(arr: np.ndarray) -> dict:
    return {
        "min": float(np.min(arr)),
        "mean": float(np.mean(arr)),
        "median": float(np.median(arr)),
        "max": float(np.max(arr)),
    }


def _curve_area(times: np.ndarray, values: np.ndarray, absolute: bool = False) -> float:
    if len(times) < 2 or len(values) < 2:
        return 0.0
    integrated_values = np.abs(values) if absolute else values
    return float(np.trapz(integrated_values, x=times))


def _confidence_level_to_z(confidence_level: float) -> float:
    tail_probability = 0.5 + (float(confidence_level) / 2)
    return float(NormalDist().inv_cdf(tail_probability))


def build_as_profile(
    times: np.ndarray,
    speeds: np.ndarray,
    accels: np.ndarray,
    absolute_times: list[str] | None,
    latitudes: list[float | None] | None,
    longitudes: list[float | None] | None,
    params: AnalyzeParams,
    total_rows: int,
):
    if params.positive_only:
        pos_mask = accels > 0
    else:
        pos_mask = np.ones_like(accels, dtype=bool)

    all_s = speeds[pos_mask]
    all_a = accels[pos_mask]

    base_mask = speeds >= params.min_speed
    if params.positive_only:
        base_mask = base_mask & (accels > 0)
    filtered_s = speeds[base_mask]
    filtered_a = accels[base_mask]

    x, y = _select_points(
        speeds,
        accels,
        min_speed=params.min_speed,
        bin_size=params.bin_size,
        top_n=params.top_n,
        positive_only=params.positive_only,
    )
    if len(x) < 2:
        raise HTTPException(status_code=400, detail="Not enough points after binning")

    intercept, slope = _fit_line(x, y)
    ci_z = _confidence_level_to_z(params.confidence_level)
    x2, y2 = _apply_ci_filter(x, y, intercept, slope, ci_z)
    if len(x2) >= 2 and (len(x2) != len(x)):
        intercept, slope = _fit_line(x2, y2)
        x, y = x2, y2

    y_hat = intercept + slope * x
    r2 = _r2(y, y_hat)
    s0 = float(-intercept / slope) if slope != 0 else float("inf")

    return {
        "all_points": [
            {"speed": float(xs), "accel": float(ys)}
            for xs, ys in zip(all_s.tolist(), all_a.tolist())
        ],
        "all_points_filtered": [
            {"speed": float(xs), "accel": float(ys)}
            for xs, ys in zip(filtered_s.tolist(), filtered_a.tolist())
        ],
        "points": [
            {"speed": float(xs), "accel": float(ys)}
            for xs, ys in zip(x.tolist(), y.tolist())
        ],
        "fit": {
            "model": "linear",
            "label": "Linear regression",
            "A0": float(intercept),
            "AS_slope": float(slope),
            "S0": s0,
            "r2": float(r2),
            "curve": [
                {"speed": 0.0, "accel": float(intercept)},
                {"speed": float(s0), "accel": 0.0},
            ],
        },
        "timeseries": {
            "time": times.tolist(),
            "speed": speeds.tolist(),
            "acceleration": accels.tolist(),
            **(
                {"absolute_time": absolute_times}
                if absolute_times and len(absolute_times) == len(times)
                else {}
            ),
            **(
                {"latitude": latitudes}
                if latitudes and len(latitudes) == len(times)
                else {}
            ),
            **(
                {"longitude": longitudes}
                if longitudes and len(longitudes) == len(times)
                else {}
            ),
        },
        "stats": {
            "speed": {
                **_stats(speeds),
                "area": _curve_area(times, speeds),
            },
            "acceleration": {
                **_stats(accels),
                "area": _curve_area(times, accels, absolute=True),
            },
        },
        "meta": {
            "n_all_points": int(len(all_s)),
            "n_all_points_filtered": int(len(filtered_s)),
            "n_points": int(len(x)),
            "min_speed": float(params.min_speed),
            "bin_size": float(params.bin_size),
            "top_n": int(params.top_n),
            "positive_only": bool(params.positive_only),
            "confidence_level": float(params.confidence_level),
            "total_rows": int(total_rows),
        },
    }

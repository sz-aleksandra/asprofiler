from __future__ import annotations

import csv

import numpy as np
import pandas as pd
from fastapi import HTTPException
from scipy.signal import butter, filtfilt

from app.schemas.analysis import GpsSeries, PreprocessingParameters

REQUIRED_COLUMNS = ("time", "speed", "latitude", "longitude")
BUTTERWORTH_CUTOFF_HZ = 2.0
BUTTERWORTH_ORDER = 4


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=400, detail=detail)


def load_series_stream(stream) -> tuple[list[str], np.ndarray, np.ndarray, np.ndarray]:
    reader = csv.DictReader(stream)
    if reader.fieldnames is None:
        raise _bad_request("Missing CSV header")

    field_map = {name.strip().lower(): name for name in reader.fieldnames}
    missing = [name for name in REQUIRED_COLUMNS if name not in field_map]
    if missing:
        raise _bad_request(f"CSV missing required columns: {', '.join(missing)}")

    columns = {key: field_map[key] for key in REQUIRED_COLUMNS}
    absolute_times: list[str] = []
    speeds: list[float] = []
    latitudes: list[float] = []
    longitudes: list[float] = []

    try:
        for row in reader:
            absolute_times.append(row[columns["time"]].strip())
            speeds.append(float(row[columns["speed"]]))
            latitudes.append(float(row[columns["latitude"]]))
            longitudes.append(float(row[columns["longitude"]]))
    except (ValueError, TypeError, AttributeError) as exc:
        raise _bad_request(f"Invalid CSV row: {exc}") from exc

    if not absolute_times:
        raise _bad_request("CSV contains no data rows")

    return (
        absolute_times,
        np.array(speeds, dtype=float),
        np.array(latitudes, dtype=float),
        np.array(longitudes, dtype=float),
    )


def _parse_time_to_seconds(value: str) -> float:
    parts = value.split(":")
    if len(parts) != 3:
        raise _bad_request(f"Invalid time value: {value!r} (expected H:MM:SS)")
    try:
        hours, minutes, seconds = (float(part) for part in parts)
    except ValueError as exc:
        raise _bad_request(f"Invalid time value: {value!r}") from exc
    return hours * 3600 + minutes * 60 + seconds


def _to_relative_seconds(absolute_times: list[str]) -> np.ndarray:
    parsed = np.array([_parse_time_to_seconds(value) for value in absolute_times], dtype=float)
    return parsed - parsed[0]


def _filter_speeds(
    speeds: np.ndarray,
    relative_times: np.ndarray,
    parameters: PreprocessingParameters,
) -> np.ndarray:
    mode = parameters.filter_mode
    window = parameters.filter_window
    series = pd.Series(speeds)

    if mode == "median" and window > 1:
        return series.rolling(window, center=True, min_periods=1).median().to_numpy()
    if mode == "mean" and window > 1:
        return series.rolling(window, center=True, min_periods=1).mean().to_numpy()
    if mode == "median_mean" and window > 1:
        median = series.rolling(window, center=True, min_periods=1).median()
        return median.rolling(window, center=True, min_periods=1).mean().to_numpy()
    if mode == "butterworth":
        return _butterworth_lowpass(speeds, relative_times)
    return speeds


def _butterworth_lowpass(values: np.ndarray, times: np.ndarray) -> np.ndarray:
    if len(values) < BUTTERWORTH_ORDER * 3:
        return values
    deltas = np.diff(times)
    valid_deltas = deltas[(deltas > 0) & np.isfinite(deltas)]
    if len(valid_deltas) == 0:
        return values
    sample_rate = 1 / float(np.median(valid_deltas))
    nyquist = sample_rate / 2
    if BUTTERWORTH_CUTOFF_HZ >= nyquist:
        return values
    coefficients_b, coefficients_a = butter(
        BUTTERWORTH_ORDER, BUTTERWORTH_CUTOFF_HZ / nyquist, btype="low"
    )
    return filtfilt(coefficients_b, coefficients_a, values)


def _derivative(values: np.ndarray, times: np.ndarray) -> np.ndarray:
    return np.gradient(values, times)


def preprocess_series(
    absolute_times: list[str],
    raw_speeds: np.ndarray,
    latitudes: np.ndarray,
    longitudes: np.ndarray,
    parameters: PreprocessingParameters,
) -> GpsSeries:
    relative_times = _to_relative_seconds(absolute_times)
    speeds = _filter_speeds(raw_speeds, relative_times, parameters)
    accelerations = _derivative(speeds, relative_times)

    return GpsSeries(
        absolute_times=absolute_times,
        relative_times=relative_times.tolist(),
        speeds=speeds.tolist(),
        accelerations=accelerations.tolist(),
        latitudes=latitudes.tolist(),
        longitudes=longitudes.tolist(),
    )
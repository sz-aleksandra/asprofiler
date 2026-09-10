from __future__ import annotations

import csv

import numpy as np
import pandas as pd
from scipy.signal import butter, filtfilt

from app.services.analysis.schemas import GpsSeries, PreprocessingParams


class PreprocessingError(ValueError):
    pass


_BUTTERWORTH_CUTOFF_FREQUENCY = 2.0
_BUTTERWORTH_ORDER = 2


def load_gps_series_stream(stream) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    reader = csv.DictReader(stream)

    absolute_times: list[str] = []
    speeds: list[float] = []
    lats: list[float] = []
    lons: list[float] = []

    for row in reader:
        absolute_times.append(row["time"].strip())
        speeds.append(float(row["speed"]))
        lats.append(float(row["lat"]))
        lons.append(float(row["lon"]))

    return (
        np.array(absolute_times, dtype=object),
        np.array(speeds, dtype=float),
        np.array(lats, dtype=float),
        np.array(lons, dtype=float),
    )


def _parse_time_to_seconds(time):
    try:
        hours_part, minutes_part, seconds_part = time.split(":")
        minutes_part = int(minutes_part)
        seconds_part = float(seconds_part)
        if not 0 <= minutes_part < 60 or not 0 <= seconds_part < 60:
            raise ValueError
        return int(hours_part) * 3600 + minutes_part * 60 + seconds_part
    except ValueError as error:
        raise PreprocessingError(f"Invalid time value: {time!r}") from error


def _apply_speed_filter(
    speeds: np.ndarray,
    relative_times: np.ndarray,
    params: PreprocessingParams,
) -> np.ndarray:
    mode = params.filter_mode
    window_samples = params.filter_window_samples

    if mode == "butterworth":
        return _apply_butterworth_low_pass(speeds, relative_times)
    if mode == "none" or window_samples <= 1:
        return speeds

    rolling_window = pd.Series(speeds).rolling(window_samples, center=True, min_periods=1)
    if mode == "median":
        return rolling_window.median().to_numpy()
    if mode == "mean":
        return rolling_window.mean().to_numpy()
    return (
        rolling_window.median().rolling(window_samples, center=True, min_periods=1).mean().to_numpy()
    )


def _apply_butterworth_low_pass(values: np.ndarray, times: np.ndarray) -> np.ndarray:
    padding_length = 3 * (_BUTTERWORTH_ORDER + 1)
    if len(values) <= padding_length:
        return values
    sample_rate = 1 / float(np.median(np.diff(times)))
    nyquist_frequency = sample_rate / 2
    if _BUTTERWORTH_CUTOFF_FREQUENCY >= nyquist_frequency:
        return values
    b_coefs, a_coefs = butter(
        _BUTTERWORTH_ORDER, _BUTTERWORTH_CUTOFF_FREQUENCY / nyquist_frequency, btype="low"
    )
    return filtfilt(b_coefs, a_coefs, values, padlen=padding_length)


def preprocess_series(
    absolute_times: np.ndarray,
    speeds: np.ndarray,
    lats: np.ndarray,
    lons: np.ndarray,
    params: PreprocessingParams,
) -> GpsSeries:
    finite_mask = np.isfinite(speeds) & np.isfinite(lats) & np.isfinite(lons)
    absolute_times = absolute_times[finite_mask]
    speeds = speeds[finite_mask]
    lats = lats[finite_mask]
    lons = lons[finite_mask]

    if len(absolute_times) == 0:
        raise PreprocessingError("CSV contains no valid data rows")

    absolute_seconds = np.array(
        [_parse_time_to_seconds(value) for value in absolute_times], dtype=float
    )
    relative_times = absolute_seconds - absolute_seconds[0]
    if np.any(np.diff(relative_times) <= 0):
        raise PreprocessingError("CSV time values must be strictly increasing")

    filtered_speeds = _apply_speed_filter(speeds, relative_times, params)
    accs = np.gradient(filtered_speeds, relative_times)

    return GpsSeries(
        absolute_times=absolute_times,
        relative_times=relative_times,
        speeds=filtered_speeds,
        accs=accs,
        lats=lats,
        lons=lons,
    )

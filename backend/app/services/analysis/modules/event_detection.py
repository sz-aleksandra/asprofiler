from __future__ import annotations

import numpy as np

from app.services.analysis.schemas import GpsSeries
from app.services.analysis.types import Direction
from app.utils.math import compute_curve_area
from app.utils.window_detection import find_windows

_EVENT_END_THRESHOLD = 0.0


def _build_phase_metrics(
    times: np.ndarray,
    speeds: np.ndarray,
    magnitudes: np.ndarray,
    speed_change,
):
    powers = magnitudes * speeds
    duration = float(times[-1] - times[0])
    return {
        "duration": duration,
        "distance": compute_curve_area(times, speeds),
        "mean_magnitude": float(np.mean(magnitudes)),
        "peak_magnitude": float(np.max(magnitudes)),
        "mean_relative_power_w_per_kg": float(np.mean(powers)),
        "peak_relative_power_w_per_kg": float(np.max(powers)),
        "impulse": speed_change,
    }


def _build_event_metrics(
    times: np.ndarray,
    speeds: np.ndarray,
    magnitudes: np.ndarray,
    entry_speed,
    exit_speed,
):
    mean_magnitude = float(np.mean(magnitudes))
    return {
        "duration": float(times[-1] - times[0]),
        "entry_speed": entry_speed,
        "exit_speed": exit_speed,
        "horizontal_impulse": exit_speed - entry_speed,
        "peak_magnitude": float(np.max(magnitudes)),
        "mean_magnitude": mean_magnitude,
        "mean_relative_power_w_per_kg": mean_magnitude * (entry_speed + exit_speed) / 2,
        "impulse": compute_curve_area(times, magnitudes),
        "distance": compute_curve_area(times, speeds),
    }


def _build_event(
    series: GpsSeries,
    start_index,
    end_index,
    direction: Direction,
):
    times = series.relative_times[start_index : end_index + 1]
    speeds = series.speeds[start_index : end_index + 1]
    accs = series.accs[start_index : end_index + 1]

    magnitudes = np.abs(np.minimum(accs, 0.0)) if direction == "dec" else np.maximum(accs, 0.0)
    entry_speed = float(speeds[0])
    exit_speed = float(speeds[-1])
    split_speed = 0.5 * (entry_speed + exit_speed)
    if direction == "dec":
        split_candidates = np.where(speeds <= split_speed)[0]
    else:
        split_candidates = np.where(speeds >= split_speed)[0]
    raw_split_offset = split_candidates[0] if len(split_candidates) else len(speeds) - 1
    split_index_offset = max(1, min(raw_split_offset, len(speeds) - 1))

    early_phase_metrics = _build_phase_metrics(
        times[: split_index_offset + 1],
        speeds[: split_index_offset + 1],
        magnitudes[: split_index_offset + 1],
        float(speeds[split_index_offset] - entry_speed),
    )
    late_phase_metrics = _build_phase_metrics(
        times[split_index_offset:],
        speeds[split_index_offset:],
        magnitudes[split_index_offset:],
        float(exit_speed - speeds[split_index_offset]),
    )

    return {
        "start_index": start_index,
        "end_index": end_index,
        "split_index": int(start_index + split_index_offset),
        **_build_event_metrics(times, speeds, magnitudes, entry_speed, exit_speed),
        **{f"early_{key}": value for key, value in early_phase_metrics.items()},
        **{f"late_{key}": value for key, value in late_phase_metrics.items()},
    }


def find_direction_events(
    series: GpsSeries,
    direction: Direction,
    min_start_value,
    min_event_duration,
    scope_mask: np.ndarray | None = None,
) -> list[dict]:
    if direction == "dec":
        start_predicate = lambda value: value <= min_start_value
        end_predicate = lambda value: value > _EVENT_END_THRESHOLD
    else:
        start_predicate = lambda value: value >= min_start_value
        end_predicate = lambda value: value < _EVENT_END_THRESHOLD
    event_windows = find_windows(
        series.relative_times,
        series.accs,
        start_predicate=start_predicate,
        end_predicate=end_predicate,
        min_duration=min_event_duration,
        mask=scope_mask,
    )
    return [
        _build_event(series, start_index, end_index, direction)
        for start_index, end_index in event_windows
    ]

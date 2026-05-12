from __future__ import annotations

import numpy as np

from app.utils.math import curve_area

DECELERATION_END_VALUE = 0.0
ACCELERATION_END_VALUE = 0.0


def _direction_magnitudes(accelerations: np.ndarray, direction: str) -> tuple[np.ndarray, float]:
    if direction == "deceleration":
        magnitudes = np.abs(np.minimum(accelerations, 0.0))
        signed_peak = float(np.min(accelerations)) if len(accelerations) else 0.0
    else:
        magnitudes = np.maximum(accelerations, 0.0)
        signed_peak = float(np.max(accelerations)) if len(accelerations) else 0.0
    return magnitudes, signed_peak


def _split_offset(event_speeds: np.ndarray, split_speed: float, direction: str) -> int:
    if len(event_speeds) <= 1:
        return 0
    if direction == "deceleration":
        candidates = np.where(event_speeds <= split_speed)[0]
    else:
        candidates = np.where(event_speeds >= split_speed)[0]
    offset = int(candidates[0]) if len(candidates) else len(event_speeds) - 1
    return max(1, min(offset, len(event_speeds) - 1))


def _phase_metrics(
    phase_times: np.ndarray,
    phase_speeds: np.ndarray,
    phase_magnitudes: np.ndarray,
    body_mass_kg: float,
    speed_change: float,
) -> dict:
    powers = phase_magnitudes * phase_speeds
    duration = float(phase_times[-1] - phase_times[0]) if len(phase_times) > 1 else 0.0
    return {
        "duration": duration,
        "distance": curve_area(phase_times, phase_speeds),
        "mean_magnitude": float(np.mean(phase_magnitudes)) if len(phase_magnitudes) else 0.0,
        "peak_magnitude": float(np.max(phase_magnitudes)) if len(phase_magnitudes) else 0.0,
        "mean_power": float(np.mean(powers)) if len(powers) else 0.0,
        "peak_power": float(np.max(powers)) if len(powers) else 0.0,
        "impulse": float(body_mass_kg * speed_change),
    }


def _maybe_indexed(values: list | None, index: int):
    if values is None or index < 0 or index >= len(values):
        return None
    return values[index]


def build_event(
    times: np.ndarray,
    speeds: np.ndarray,
    accelerations: np.ndarray,
    absolute_times: list[str] | None,
    latitudes: list[float | None] | None,
    longitudes: list[float | None] | None,
    body_mass_kg: float,
    start_index: int,
    end_index: int,
    direction: str,
    index_offset: int = 0,
) -> dict:
    event_times = times[start_index : end_index + 1]
    event_speeds = speeds[start_index : end_index + 1]
    event_accelerations = accelerations[start_index : end_index + 1]

    magnitudes, signed_peak = _direction_magnitudes(event_accelerations, direction)
    entry_speed = float(event_speeds[0])
    exit_speed = float(event_speeds[-1])
    event_peak_speed = float(np.max(event_speeds)) if len(event_speeds) else 0.0
    split_speed = float(0.5 * event_peak_speed)
    split_offset = _split_offset(event_speeds, split_speed, direction)
    midpoint_index = (start_index + end_index) // 2

    first_phase = _phase_metrics(
        event_times[: split_offset + 1],
        event_speeds[: split_offset + 1],
        magnitudes[: split_offset + 1],
        body_mass_kg,
        float(event_speeds[split_offset] - entry_speed),
    )
    second_phase = _phase_metrics(
        event_times[split_offset:],
        event_speeds[split_offset:],
        magnitudes[split_offset:],
        body_mass_kg,
        float(exit_speed - event_speeds[split_offset]),
    )

    return {
        "start_index": int(index_offset + start_index),
        "end_index": int(index_offset + end_index),
        "start_time": float(event_times[0]),
        "end_time": float(event_times[-1]),
        "start_absolute_time": _maybe_indexed(absolute_times, start_index) or "",
        "end_absolute_time": _maybe_indexed(absolute_times, end_index) or "",
        "duration": float(event_times[-1] - event_times[0]) if len(event_times) > 1 else 0.0,
        "entry_speed": entry_speed,
        "exit_speed": exit_speed,
        "max_speed": float(np.max(event_speeds)) if len(event_speeds) else 0.0,
        "horizontal_braking_impulse": float(body_mass_kg * (exit_speed - entry_speed)),
        "peak_acceleration": signed_peak,
        "peak_magnitude": float(np.max(magnitudes)) if len(magnitudes) else 0.0,
        "mean_acceleration": float(np.mean(event_accelerations)) if len(event_accelerations) else 0.0,
        "impulse": curve_area(event_times, magnitudes),
        "distance": curve_area(event_times, event_speeds),
        "split_speed": split_speed,
        "split_time": float(event_times[split_offset]),
        "split_index": int(index_offset + start_index + split_offset),
        "midpoint_index": int(index_offset + midpoint_index),
        "midpoint_latitude": _maybe_indexed(latitudes, midpoint_index),
        "midpoint_longitude": _maybe_indexed(longitudes, midpoint_index),
        "first_phase_duration": first_phase["duration"],
        "second_phase_duration": second_phase["duration"],
        "first_phase_distance": first_phase["distance"],
        "second_phase_distance": second_phase["distance"],
        "first_phase_mean_magnitude": first_phase["mean_magnitude"],
        "second_phase_mean_magnitude": second_phase["mean_magnitude"],
        "first_phase_peak_magnitude": first_phase["peak_magnitude"],
        "second_phase_peak_magnitude": second_phase["peak_magnitude"],
        "first_phase_mean_power": first_phase["mean_power"],
        "second_phase_mean_power": second_phase["mean_power"],
        "first_phase_peak_power": first_phase["peak_power"],
        "second_phase_peak_power": second_phase["peak_power"],
        "first_phase_impulse": first_phase["impulse"],
        "second_phase_impulse": second_phase["impulse"],
    }


def _event_window_predicates(direction: str, minimum_value_for_event_start: float):
    if direction == "deceleration":
        return (
            lambda value: value <= minimum_value_for_event_start,
            lambda value: value > DECELERATION_END_VALUE,
        )
    return (
        lambda value: value >= minimum_value_for_event_start,
        lambda value: value < ACCELERATION_END_VALUE,
    )


def _find_event_windows(
    accelerations: np.ndarray,
    start_predicate,
    end_predicate,
) -> list[tuple[int, int]]:
    windows = []
    index = 0
    sample_count = len(accelerations)
    while index < sample_count:
        if not start_predicate(float(accelerations[index])):
            index += 1
            continue
        start_index = index
        end_index = index
        index += 1
        while index < sample_count and not end_predicate(float(accelerations[index])):
            end_index = index
            index += 1
        windows.append((start_index, end_index))
    return windows


def detect_directional_events(
    times: np.ndarray,
    speeds: np.ndarray,
    accelerations: np.ndarray,
    absolute_times: list[str] | None,
    latitudes: list[float | None] | None,
    longitudes: list[float | None] | None,
    body_mass_kg: float,
    direction: str,
    minimum_value_for_event_start: float,
    minimum_event_duration_seconds: float,
    index_offset: int = 0,
) -> list[dict]:
    start_predicate, end_predicate = _event_window_predicates(direction, minimum_value_for_event_start)
    events = [
        build_event(
            times, speeds, accelerations, absolute_times,
            latitudes, longitudes, body_mass_kg,
            start_index, end_index, direction, index_offset,
        )
        for start_index, end_index in _find_event_windows(accelerations, start_predicate, end_predicate)
    ]
    return [event for event in events if event["duration"] >= minimum_event_duration_seconds]


def detect_directional_events_in_windows(
    times: np.ndarray,
    speeds: np.ndarray,
    accelerations: np.ndarray,
    absolute_times: list[str] | None,
    latitudes: list[float | None] | None,
    longitudes: list[float | None] | None,
    body_mass_kg: float,
    direction: str,
    minimum_value_for_event_start: float,
    minimum_event_duration_seconds: float,
    windows: list[tuple[int, int]],
) -> list[dict]:
    events = []
    for window_start, window_end in windows:
        events.extend(
            detect_directional_events(
                times[window_start : window_end + 1],
                speeds[window_start : window_end + 1],
                accelerations[window_start : window_end + 1],
                absolute_times[window_start : window_end + 1] if absolute_times and window_end < len(absolute_times) else None,
                latitudes[window_start : window_end + 1] if latitudes and window_end < len(latitudes) else None,
                longitudes[window_start : window_end + 1] if longitudes and window_end < len(longitudes) else None,
                body_mass_kg,
                direction,
                minimum_value_for_event_start,
                minimum_event_duration_seconds,
                window_start,
            )
        )
    return events

from __future__ import annotations

import numpy as np


def detect_high_speed_running_windows(
    times: np.ndarray,
    speeds: np.ndarray,
    minimum_high_speed_running_speed_meters_per_second: float,
    minimum_high_speed_running_duration_seconds: float,
    eligible_mask: np.ndarray | None = None,
) -> list[tuple[int, int]]:
    if len(times) == 0 or len(speeds) == 0:
        return []

    windows = []
    start_index = None
    for index, speed in enumerate(speeds):
        eligible = True if eligible_mask is None else bool(eligible_mask[index])
        if eligible and float(speed) > minimum_high_speed_running_speed_meters_per_second:
            if start_index is None:
                start_index = index
            continue

        if start_index is not None:
            end_index = index - 1
            if float(times[end_index]) - float(times[start_index]) >= minimum_high_speed_running_duration_seconds:
                windows.append((start_index, end_index))
            start_index = None

    if start_index is not None:
        end_index = len(speeds) - 1
        if float(times[end_index]) - float(times[start_index]) >= minimum_high_speed_running_duration_seconds:
            windows.append((start_index, end_index))

    return windows


def detect_per_zone_hsr_windows(
    times: np.ndarray,
    speeds: np.ndarray,
    zone_by_index: dict[int, str | None],
    minimum_high_speed_running_speed_meters_per_second: float,
    minimum_high_speed_running_duration_seconds: float,
) -> dict[str, list[tuple[int, int]]]:
    sample_count = len(times)
    per_zone_windows: dict[str, list[tuple[int, int]]] = {}
    if sample_count == 0:
        return {zone: [] for zone in ("left", "middle", "right")}

    for zone_name in ("left", "middle", "right"):
        zone_eligible_mask = np.array(
            [zone_by_index.get(index) == zone_name for index in range(sample_count)],
            dtype=bool,
        )
        per_zone_windows[zone_name] = detect_high_speed_running_windows(
            times,
            speeds,
            minimum_high_speed_running_speed_meters_per_second,
            minimum_high_speed_running_duration_seconds,
            eligible_mask=zone_eligible_mask,
        )
    return per_zone_windows

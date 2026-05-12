from __future__ import annotations

import math

import numpy as np

from app.utils.math import curve_area, stats
from app.utils.pitch import (
    build_window_sample_mask,
    build_zone_sample_mask,
    project_pitch_points,
    zone_from_x,
)

ZONE_NAMES = ("left", "middle", "right")


def _integrate_mask_duration(times: np.ndarray, mask: np.ndarray) -> float:
    total_duration_seconds = 0.0
    for index in range(1, len(times)):
        t0 = float(times[index - 1])
        t1 = float(times[index])
        if not math.isfinite(t0) or not math.isfinite(t1) or t1 <= t0:
            continue
        previous_in_scope = 1 if mask[index - 1] else 0
        current_in_scope = 1 if mask[index] else 0
        total_duration_seconds += ((previous_in_scope + current_in_scope) / 2) * (t1 - t0)
    return total_duration_seconds


def tag_events_with_zone(
    events: list[dict],
    x_by_index: dict[int, float] | None,
    forced_zone: str | None = None,
) -> list[dict]:
    if forced_zone is not None:
        return [
            {
                **event,
                "zone_x": (x_by_index or {}).get(int(event.get("midpoint_index", -1))),
                "pitch_zone": forced_zone,
            }
            for event in events
        ]
    if not x_by_index:
        return events
    return [
        {
            **event,
            "zone_x": x_by_index.get(int(event.get("midpoint_index", -1))),
            "pitch_zone": zone_from_x(x_by_index.get(int(event.get("midpoint_index", -1)))),
        }
        for event in events
    ]


def build_zone_by_index(
    latitudes: list[float | None] | None,
    longitudes: list[float | None] | None,
    speeds: np.ndarray,
    minimum_speed: float,
) -> dict[int, str | None]:
    projected_points = project_pitch_points(latitudes, longitudes, speeds, minimum_speed)
    if not projected_points:
        return {}
    return {point["index"]: zone_from_x(point["x"]) for point in projected_points}


def build_x_by_index(
    latitudes: list[float | None] | None,
    longitudes: list[float | None] | None,
    speeds: np.ndarray,
    minimum_speed: float,
) -> dict[int, float] | None:
    projected_points = project_pitch_points(latitudes, longitudes, speeds, minimum_speed)
    if not projected_points:
        return None
    return {point["index"]: point["x"] for point in projected_points}


def _summarize_zone_metrics(
    times: np.ndarray,
    speeds: np.ndarray,
    accelerations: np.ndarray,
    sample_mask: np.ndarray,
) -> dict:
    speed_values = speeds[sample_mask]
    acceleration_values = accelerations[(accelerations > 0) & sample_mask]
    deceleration_values = np.abs(accelerations[(accelerations < 0) & sample_mask])
    speed_area_values = np.where(sample_mask, speeds, 0.0)
    acceleration_area_values = np.where(sample_mask & (accelerations > 0), accelerations, 0.0)
    deceleration_area_values = np.where(sample_mask & (accelerations < 0), np.abs(accelerations), 0.0)
    return {
        "duration_seconds": _integrate_mask_duration(times, sample_mask),
        "speed": {
            **stats(speed_values),
            "area": curve_area(times, speed_area_values),
        },
        "acceleration": {
            **stats(acceleration_values),
            "area": curve_area(times, acceleration_area_values),
        },
        "deceleration": {
            **stats(deceleration_values),
            "area": curve_area(times, deceleration_area_values),
        },
    }


def _zone_mask(
    zone_by_index: dict[int, str | None],
    sample_count: int,
    zone_name: str,
) -> np.ndarray:
    if not zone_by_index:
        return np.zeros(sample_count, dtype=bool)
    return build_zone_sample_mask(zone_by_index, np.ones(sample_count, dtype=bool), zone_name)


def _windows_mask(sample_count: int, windows: list[tuple[int, int]] | None) -> np.ndarray:
    mask = build_window_sample_mask(sample_count, windows)
    return mask if mask is not None else np.zeros(sample_count, dtype=bool)


def summarize_pitch_zone_stats(
    times: np.ndarray,
    speeds: np.ndarray,
    accelerations: np.ndarray,
    latitudes: list[float | None] | None,
    longitudes: list[float | None] | None,
    minimum_speed: float,
    high_speed_running_windows: list[tuple[int, int]] | None = None,
    per_zone_high_speed_running_windows: dict[str, list[tuple[int, int]]] | None = None,
) -> dict:
    sample_count = len(times)
    zone_by_index = build_zone_by_index(latitudes, longitudes, speeds, minimum_speed)
    per_zone_hsr = per_zone_high_speed_running_windows or {}

    masks = {
        "all": {
            "full": np.ones(sample_count, dtype=bool),
            **{zone: _zone_mask(zone_by_index, sample_count, zone) for zone in ZONE_NAMES},
        },
        "high_speed_running": {
            "full": _windows_mask(sample_count, high_speed_running_windows),
            **{zone: _windows_mask(sample_count, per_zone_hsr.get(zone, [])) for zone in ZONE_NAMES},
        },
    }
    return {
        scope: {zone: _summarize_zone_metrics(times, speeds, accelerations, mask) for zone, mask in zone_masks.items()}
        for scope, zone_masks in masks.items()
    }


def build_statistics_rows(pitch_zone_stats: dict) -> dict:
    statistics_rows = {}
    for scope_name, scoped_zone_stats in pitch_zone_stats.items():
        statistics_rows[scope_name] = {}
        for zone_name in ("full", "left", "middle", "right"):
            zone_stats = scoped_zone_stats.get(zone_name, {})
            duration_seconds = float(zone_stats.get("duration_seconds", 0.0) or 0.0)
            statistics_rows[scope_name][zone_name] = [
                {
                    "metric": "speed",
                    "metric_label": "Speed",
                    "duration_seconds": duration_seconds,
                    "values": zone_stats.get("speed", {}),
                },
                {
                    "metric": "acceleration",
                    "metric_label": "Acceleration",
                    "duration_seconds": duration_seconds,
                    "values": zone_stats.get("acceleration", {}),
                },
                {
                    "metric": "deceleration",
                    "metric_label": "Deceleration",
                    "duration_seconds": duration_seconds,
                    "values": zone_stats.get("deceleration", {}),
                },
            ]
    return statistics_rows

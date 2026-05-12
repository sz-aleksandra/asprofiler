from __future__ import annotations

import math

import numpy as np

from app.services.pitch_zones import build_zone_by_index
from app.utils.pitch import build_window_sample_mask, build_zone_sample_mask


def summarize_distribution(values: np.ndarray, bin_size: float = 1.0) -> dict:
    finite_values = np.asarray(values, dtype=float)
    finite_values = finite_values[np.isfinite(finite_values)]
    if len(finite_values) == 0:
        return {
            "bin_size": bin_size,
            "range_start": 0.0,
            "range_end": bin_size,
            "bins": [],
        }

    range_start = math.floor(float(np.min(finite_values)) / bin_size) * bin_size
    max_value = float(np.max(finite_values))
    range_end = max(range_start + bin_size, (math.floor(max_value / bin_size) + 1) * bin_size)
    bin_count = max(1, int(round((range_end - range_start) / bin_size)))
    counts = [0] * bin_count

    for value in finite_values:
        raw_index = int(math.floor((float(value) - range_start) / bin_size))
        safe_index = min(max(raw_index, 0), bin_count - 1)
        counts[safe_index] += 1

    return {
        "bin_size": bin_size,
        "range_start": range_start,
        "range_end": range_end,
        "bins": [
            {
                "start": range_start + (index * bin_size),
                "end": range_start + ((index + 1) * bin_size),
                "count": int(count),
            }
            for index, count in enumerate(counts)
        ],
    }


def summarize_sample_distributions_for_mask(
    speeds: np.ndarray,
    accelerations: np.ndarray,
    latitudes: list[float | None] | None,
    longitudes: list[float | None] | None,
    minimum_speed: float,
    sample_mask: np.ndarray | None = None,
    bin_size: float = 1.0,
) -> dict:
    effective_mask = (
        np.asarray(sample_mask, dtype=bool)
        if sample_mask is not None and len(sample_mask) == len(speeds)
        else np.ones(len(speeds), dtype=bool)
    )
    zone_by_index = build_zone_by_index(latitudes, longitudes, speeds, minimum_speed)

    def collect_zone_values(zone_name: str | None) -> dict:
        zone_mask = (
            effective_mask
            if zone_name is None
            else build_zone_sample_mask(zone_by_index, effective_mask, zone_name)
        )
        return {
            "speed": summarize_distribution(speeds[zone_mask], bin_size),
            "acceleration": summarize_distribution(accelerations[(accelerations > 0) & zone_mask], bin_size),
            "deceleration": summarize_distribution(np.abs(accelerations[(accelerations < 0) & zone_mask]), bin_size),
        }

    return {
        "full": collect_zone_values(None),
        "left": collect_zone_values("left"),
        "middle": collect_zone_values("middle"),
        "right": collect_zone_values("right"),
    }


def summarize_sample_distributions(
    speeds: np.ndarray,
    accelerations: np.ndarray,
    latitudes: list[float | None] | None,
    longitudes: list[float | None] | None,
    minimum_speed: float,
    high_speed_running_windows: list[tuple[int, int]] | None = None,
    bin_size: float = 1.0,
) -> dict:
    return {
        "all": summarize_sample_distributions_for_mask(
            speeds,
            accelerations,
            latitudes,
            longitudes,
            minimum_speed,
            None,
            bin_size,
        ),
        "high_speed_running": summarize_sample_distributions_for_mask(
            speeds,
            accelerations,
            latitudes,
            longitudes,
            minimum_speed,
            build_window_sample_mask(len(speeds), high_speed_running_windows),
            bin_size,
        ),
    }

from __future__ import annotations

import math

import numpy as np

PITCH_LENGTH_METERS = 105.0


def project_pitch_points(
    latitudes: list[float | None] | None,
    longitudes: list[float | None] | None,
    speeds: np.ndarray,
    minimum_speed: float,
) -> list[dict] | None:
    if not latitudes or not longitudes:
        return None

    points = []
    for index, (latitude, longitude) in enumerate(zip(latitudes, longitudes)):
        if latitude is None or longitude is None:
            continue
        if not math.isfinite(float(latitude)) or not math.isfinite(float(longitude)):
            continue
        points.append(
            {
                "index": index,
                "speed": float(speeds[index]) if index < len(speeds) else 0.0,
                "latitude": float(latitude),
                "longitude": float(longitude),
            }
        )

    if len(points) < 2:
        return None

    fast_points = [point for point in points if point["speed"] > minimum_speed]
    if len(fast_points) < 10:
        fast_points = points

    lat0 = sum(math.radians(point["latitude"]) for point in fast_points) / len(fast_points)
    lon0 = sum(math.radians(point["longitude"]) for point in fast_points) / len(fast_points)

    projected = []
    for point in points:
        lat_rad = math.radians(point["latitude"])
        lon_rad = math.radians(point["longitude"])
        projected.append(
            {
                "index": point["index"],
                "x": (lon_rad - lon0) * math.cos(lat0) * 6371000,
                "y": (lat_rad - lat0) * 6371000,
                "speed": point["speed"],
            }
        )

    fast_projected = [point for point in projected if point["speed"] > minimum_speed]
    if len(fast_projected) < 10:
        fast_projected = projected

    xmin = min(point["x"] for point in fast_projected)
    xmax = max(point["x"] for point in fast_projected)
    x_shift = 0.0
    if xmin < -(PITCH_LENGTH_METERS / 2):
        x_shift += -(PITCH_LENGTH_METERS / 2) - xmin
    if xmax + x_shift > PITCH_LENGTH_METERS / 2:
        x_shift += PITCH_LENGTH_METERS / 2 - (xmax + x_shift)

    return [{"index": point["index"], "x": point["x"] + x_shift + (PITCH_LENGTH_METERS / 2)} for point in projected]


def zone_from_x(x_value: float | None) -> str | None:
    if x_value is None or not math.isfinite(float(x_value)):
        return None
    third = PITCH_LENGTH_METERS / 3
    if x_value < third:
        return "left"
    if x_value < third * 2:
        return "middle"
    return "right"


def build_window_sample_mask(
    sample_count: int,
    windows: list[tuple[int, int]] | None,
) -> np.ndarray | None:
    if sample_count <= 0 or not windows:
        return None

    mask = np.zeros(sample_count, dtype=bool)
    for start_index, end_index in windows:
        safe_start = max(0, int(start_index))
        safe_end = min(sample_count - 1, int(end_index))
        if safe_start > safe_end:
            continue
        mask[safe_start : safe_end + 1] = True
    return mask


def build_zone_sample_mask(
    zone_by_index: dict[int, str | None],
    effective_mask: np.ndarray,
    zone_name: str,
    minimum_contiguous_samples: int = 2,
) -> np.ndarray:
    zone_mask = np.array(
        [
            bool(effective_mask[index]) and zone_by_index.get(index) == zone_name
            for index in range(len(effective_mask))
        ],
        dtype=bool,
    )
    if minimum_contiguous_samples <= 1 or len(zone_mask) == 0:
        return zone_mask

    filtered_zone_mask = np.zeros(len(zone_mask), dtype=bool)
    run_start = None
    for index, in_zone in enumerate(zone_mask):
        if in_zone:
            if run_start is None:
                run_start = index
            continue
        if run_start is not None:
            run_length = index - run_start
            if run_length >= minimum_contiguous_samples:
                filtered_zone_mask[run_start:index] = True
            run_start = None

    if run_start is not None:
        run_length = len(zone_mask) - run_start
        if run_length >= minimum_contiguous_samples:
            filtered_zone_mask[run_start:] = True

    return filtered_zone_mask

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np
from scipy.spatial import ConvexHull

Zone = Literal["left", "middle", "right"]


class PitchProjectionError(ValueError):
    pass


_PITCH_LENGTH = 105.0
_EARTH_RADIUS = 6_371_000.0


@dataclass
class PitchProjectionContext:
    origin_lat_radians: float
    origin_lon_radians: float
    axis_x: float
    axis_y: float
    x_offset: float
    y_offset: float


def find_fast_points(
    lats: np.ndarray,
    lons: np.ndarray,
    speeds: np.ndarray,
    min_speed,
) -> tuple[np.ndarray, np.ndarray]:
    mask = speeds >= min_speed
    return lats[mask], lons[mask]


def _find_minimum_bounding_rectangle(
    pitch_coordinates: np.ndarray,
) -> tuple[float, float, float, float]:
    convex_hull_points = pitch_coordinates[ConvexHull(pitch_coordinates).vertices]
    convex_hull_edges = np.diff(np.vstack([convex_hull_points, convex_hull_points[:1]]), axis=0)
    edge_directions = convex_hull_edges / np.hypot(
        convex_hull_edges[:, 0], convex_hull_edges[:, 1]
    )[:, None]

    minimum_area = np.inf
    minimum_rectangle = None
    for direction in edge_directions:
        perpendicular_direction = np.array([-direction[1], direction[0]])
        along_projection = pitch_coordinates @ direction
        perpendicular_projection = pitch_coordinates @ perpendicular_direction
        min_along_projection, max_along_projection = (
            along_projection.min(),
            along_projection.max(),
        )
        min_perpendicular_projection, max_perpendicular_projection = (
            perpendicular_projection.min(),
            perpendicular_projection.max(),
        )
        width = max_along_projection - min_along_projection
        height = max_perpendicular_projection - min_perpendicular_projection
        rectangle_area = width * height
        if rectangle_area < minimum_area:
            minimum_area = rectangle_area
            rectangle_center = (
                ((min_along_projection + max_along_projection) / 2) * direction
                + ((min_perpendicular_projection + max_perpendicular_projection) / 2)
                * perpendicular_direction
            )
            long_axis = direction if width >= height else perpendicular_direction
            minimum_rectangle = (
                float(long_axis[0]),
                float(long_axis[1]),
                float(rectangle_center[0]),
                float(rectangle_center[1]),
            )
    return minimum_rectangle


def compute_pitch_projection_context(
    fast_lats: np.ndarray,
    fast_lons: np.ndarray,
) -> PitchProjectionContext:
    if len(fast_lats) < 3:
        raise PitchProjectionError(
            "Not enough GPS points above 3.0 m/s to estimate pitch orientation"
        )

    lat_radians = np.radians(fast_lats)
    lon_radians = np.radians(fast_lons)
    origin_lat_radians = float(lat_radians.mean())
    origin_lon_radians = float(lon_radians.mean())
    cos_origin_lat = np.cos(origin_lat_radians)

    east_offset = (lon_radians - origin_lon_radians) * cos_origin_lat * _EARTH_RADIUS
    north_offset = (lat_radians - origin_lat_radians) * _EARTH_RADIUS
    pitch_coordinates = np.column_stack([east_offset, north_offset])

    axis_x, axis_y, center_x, center_y = _find_minimum_bounding_rectangle(pitch_coordinates)
    center_along = center_x * axis_x + center_y * axis_y
    center_perpendicular = -center_x * axis_y + center_y * axis_x

    return PitchProjectionContext(
        origin_lat_radians=origin_lat_radians,
        origin_lon_radians=origin_lon_radians,
        axis_x=axis_x,
        axis_y=axis_y,
        x_offset=float(_PITCH_LENGTH / 2 - center_along),
        y_offset=float(-center_perpendicular),
    )


def project_pitch_points(
    lats: np.ndarray,
    lons: np.ndarray,
    projection_context: PitchProjectionContext,
) -> tuple[np.ndarray, np.ndarray]:
    cos_origin_lat = np.cos(projection_context.origin_lat_radians)
    lat_radians = np.radians(lats)
    lon_radians = np.radians(lons)
    east_offset = (
        lon_radians - projection_context.origin_lon_radians
    ) * cos_origin_lat * _EARTH_RADIUS
    north_offset = (lat_radians - projection_context.origin_lat_radians) * _EARTH_RADIUS

    x = (
        east_offset * projection_context.axis_x
        + north_offset * projection_context.axis_y
        + projection_context.x_offset
    )
    y = (
        -east_offset * projection_context.axis_y
        + north_offset * projection_context.axis_x
        + projection_context.y_offset
    )
    return x, y


def build_pitch_zone_labels(pitch_x_values: np.ndarray) -> np.ndarray:
    zones = np.empty(pitch_x_values.shape, dtype=object)
    zone_width = _PITCH_LENGTH / 3
    left_zone_mask = pitch_x_values < zone_width
    right_zone_mask = pitch_x_values >= 2 * zone_width
    middle_zone_mask = ~left_zone_mask & ~right_zone_mask
    zones[left_zone_mask] = "left"
    zones[middle_zone_mask] = "middle"
    zones[right_zone_mask] = "right"
    return zones


def build_window_mask(sample_count, windows: list[tuple[int, int]]) -> np.ndarray:
    mask = np.zeros(sample_count, dtype=bool)
    for start_index, end_index in windows:
        mask[start_index : end_index + 1] = True
    return mask


def build_zone_mask(
    zones: np.ndarray,
    zone_name: Zone,
) -> np.ndarray:
    return zones == zone_name

from __future__ import annotations

import numpy as np
import pytest

from app.utils.pitch import (
    PitchProjectionError,
    build_pitch_zone_labels,
    build_window_mask,
    build_zone_mask,
    compute_pitch_projection_context,
    find_fast_points,
    project_pitch_points,
)

PITCH_LENGTH_M = 105.0


def _build_pitch_track_coordinates(
    sample_count: int = 20,
) -> tuple[np.ndarray, np.ndarray]:
    random_generator = np.random.default_rng(0)
    lats = 52.0 + random_generator.normal(0, 1e-5, sample_count)
    lons = (
        21.0
        + np.linspace(0.0, 1e-3, sample_count)
        + random_generator.normal(0, 1e-5, sample_count)
    )
    return lats, lons


class TestFindFastPoints:
    def test_filters_out_points_below_min_speed(self):
        lats = np.array([1.0, 2.0, 3.0])
        lons = np.array([10.0, 20.0, 30.0])
        fast_lats, fast_lons = find_fast_points(
            lats, lons, np.array([1.0, 5.0, 2.0]), min_speed=3.0,
        )
        assert fast_lats.tolist() == [2.0]
        assert fast_lons.tolist() == [20.0]

    def test_returns_empty_when_all_points_slow(self):
        fast_lats, fast_lons = find_fast_points(
            np.array([1.0, 2.0]),
            np.array([10.0, 20.0]),
            np.array([0.5, 1.0]),
            min_speed=3.0,
        )
        assert fast_lats.size == 0
        assert fast_lons.size == 0


class TestBuildPitchZoneLabels:
    def test_zone_boundaries(self):
        third_length = PITCH_LENGTH_M / 3
        x_values = np.array([
            0.0,
            third_length - 0.01,
            third_length,
            2 * third_length - 0.01,
            2 * third_length,
            PITCH_LENGTH_M,
        ])
        assert build_pitch_zone_labels(x_values).tolist() == [
            "left", "left", "middle", "middle", "right", "right",
        ]


class TestBuildWindowMask:
    def test_empty_windows_produce_all_false_mask(self):
        assert build_window_mask(5, []).tolist() == [False] * 5

    def test_windows_are_inclusive_on_both_ends(self):
        assert build_window_mask(6, [(1, 3), (5, 5)]).tolist() == [
            False, True, True, True, False, True,
        ]


class TestBuildZoneMask:
    def test_matches_named_zone(self):
        zones = np.array(["left", "middle", "right", "left"], dtype=object)
        assert build_zone_mask(zones, "left").tolist() == [True, False, False, True]


class TestComputePitchProjectionContext:
    def test_raises_when_too_few_points(self):
        with pytest.raises(PitchProjectionError):
            compute_pitch_projection_context(
                np.array([52.0, 52.0]), np.array([21.0, 21.0]),
            )

    def test_produces_axis_and_origin(self):
        lats, lons = _build_pitch_track_coordinates()
        projection_context = compute_pitch_projection_context(lats, lons)
        assert projection_context.origin_lat_radians == pytest.approx(
            np.radians(52.0), abs=1e-4,
        )
        assert abs(projection_context.axis_x) + abs(projection_context.axis_y) > 0


class TestProjectPitchPoints:
    def test_bounding_box_is_centered_on_pitch(self):
        lats, lons = _build_pitch_track_coordinates()
        projection_context = compute_pitch_projection_context(lats, lons)
        x_values, y_values = project_pitch_points(lats, lons, projection_context)
        assert (x_values.min() + x_values.max()) / 2 == pytest.approx(
            PITCH_LENGTH_M / 2, abs=1e-6,
        )
        assert (y_values.min() + y_values.max()) / 2 == pytest.approx(0.0, abs=1e-6)

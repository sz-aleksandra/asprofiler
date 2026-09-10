from __future__ import annotations

import numpy as np

from app.utils.window_detection import find_windows


def _above_threshold(threshold):
    return lambda value: value >= threshold


def _below_threshold(threshold):
    return lambda value: value < threshold


class TestFindWindows:
    def test_empty_input(self):
        assert find_windows(
            np.array([]), np.array([]),
            _above_threshold(1.0), _below_threshold(1.0), 0.0,
        ) == []

    def test_single_window(self):
        times = np.arange(10) * 0.1
        values = np.array([0, 0, 2, 2, 2, 2, 0, 0, 0, 0], dtype=float)
        assert find_windows(
            times, values, _above_threshold(1.0), _below_threshold(1.0), 0.2,
        ) == [(2, 5)]

    def test_dropped_when_below_min_duration(self):
        times = np.arange(5) * 0.1
        values = np.array([0, 2, 0, 0, 0], dtype=float)
        assert find_windows(
            times, values, _above_threshold(1.0), _below_threshold(1.0), 1.0,
        ) == []

    def test_open_window_at_end_kept_when_long_enough(self):
        times = np.arange(6) * 0.1
        values = np.array([0, 0, 2, 2, 2, 2], dtype=float)
        assert find_windows(
            times, values, _above_threshold(1.0), _below_threshold(1.0), 0.2,
        ) == [(2, 5)]

    def test_open_window_at_end_dropped_when_too_short(self):
        times = np.arange(4) * 0.1
        values = np.array([0, 0, 0, 2], dtype=float)
        assert find_windows(
            times, values, _above_threshold(1.0), _below_threshold(1.0), 0.2,
        ) == []

    def test_multiple_windows(self):
        times = np.arange(12) * 0.1
        values = np.array([2, 2, 2, 0, 0, 2, 2, 2, 0, 2, 2, 2], dtype=float)
        assert find_windows(
            times, values, _above_threshold(1.0), _below_threshold(1.0), 0.2,
        ) == [(0, 2), (5, 7), (9, 11)]

    def test_mask_excludes_samples(self):
        times = np.arange(6) * 0.1
        values = np.full(6, 2.0)
        mask = np.array([True, True, True, False, True, True])
        assert find_windows(
            times, values,
            _above_threshold(1.0), _below_threshold(1.0), 0.0,
            mask=mask,
        ) == [(0, 2), (4, 5)]

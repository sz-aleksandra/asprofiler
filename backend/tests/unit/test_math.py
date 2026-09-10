from __future__ import annotations

import numpy as np
import pytest

from app.utils.math import compute_curve_area, summarize_stats


class TestSummarizeStats:
    def test_empty_returns_none(self):
        assert summarize_stats(np.array([])) == {
            "min": None, "mean": None, "median": None, "max": None,
        }

    def test_returns_min_mean_median_max(self):
        assert summarize_stats(np.array([1.0, 2.0, 3.0, 4.0])) == {
            "min": 1.0, "mean": 2.5, "median": 2.5, "max": 4.0,
        }


class TestComputeCurveArea:
    def test_constant_values_give_rectangle_area(self):
        times = np.array([0.0, 1.0, 2.0, 3.0])
        assert compute_curve_area(times, np.full(4, 5.0)) == pytest.approx(15.0)

    def test_linear_ramp_gives_triangle_area(self):
        times = np.linspace(0.0, 2.0, 21)
        assert compute_curve_area(times, times) == pytest.approx(2.0)

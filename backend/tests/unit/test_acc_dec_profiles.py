from __future__ import annotations

import numpy as np
import pytest

from app.services.analysis.modules.acc_dec_profiles import (
    _calculate_r_squared_score,
    _remove_confidence_interval_outliers,
    build_acc_dec_profile,
)
from app.services.analysis.schemas import AnalysisParams, GpsSeries


def _build_linear_gps_series(sample_count: int = 60) -> GpsSeries:
    relative_times = np.arange(sample_count) * 0.1
    speeds = np.linspace(3.0, 9.0, sample_count)
    accs = -0.5 * speeds + 5.0
    return GpsSeries(
        absolute_times=np.array(
            [f"00:00:{time:06.3f}" for time in relative_times], dtype=object,
        ),
        relative_times=relative_times,
        speeds=speeds,
        accs=accs,
        lats=np.full(sample_count, 52.0),
        lons=21.0 + np.arange(sample_count) * 1e-5,
    )


class TestBuildAccDecProfile:
    def test_acc_direction_on_sprint_produces_fit_and_labels(
        self, sprint_series, analysis_params_defaults,
    ):
        profile = build_acc_dec_profile(
            "acc", sprint_series, AnalysisParams(**analysis_params_defaults),
        )
        assert profile.fit is not None
        assert 0.0 <= profile.fit.r_squared <= 1.0
        assert len(profile.point_labels) == len(sprint_series.speeds)
        assert set(profile.point_labels).issubset({"s", "i", "e"})

    def test_dec_direction_on_sprint_produces_fit(
        self, sprint_series, analysis_params_defaults,
    ):
        profile = build_acc_dec_profile(
            "dec", sprint_series, AnalysisParams(**analysis_params_defaults),
        )
        assert profile.fit is not None

    def test_no_fit_when_no_candidates(self, flat_series, analysis_params_defaults):
        profile = build_acc_dec_profile(
            "acc", flat_series, AnalysisParams(**analysis_params_defaults),
        )
        assert profile.fit is None
        assert set(profile.point_labels) == {"e"}

    def test_high_min_speed_yields_no_fit(self, sprint_series, analysis_params_defaults):
        profile = build_acc_dec_profile(
            "acc",
            sprint_series,
            AnalysisParams(**{**analysis_params_defaults, "min_acc_speed_m_per_s": 50.0}),
        )
        assert profile.fit is None

    def test_refit_skipped_when_no_outliers(self, analysis_params_defaults):
        profile = build_acc_dec_profile(
            "acc", _build_linear_gps_series(), AnalysisParams(**analysis_params_defaults),
        )
        assert profile.fit is not None
        assert profile.fit.slope == pytest.approx(-0.5)
        assert profile.fit.intercept == pytest.approx(5.0)


class TestCalculateRSquaredScore:
    def test_returns_zero_when_selected_accs_constant(self):
        assert _calculate_r_squared_score(
            np.full(4, 2.0), np.array([1.0, 2.0, 3.0, 4.0]),
        ) == 0.0


class TestRemoveConfidenceIntervalOutliers:
    def test_returns_input_when_sample_count_at_most_two(self):
        speeds, accs = np.array([1.0, 2.0]), np.array([3.0, 4.0])
        filtered_speeds, filtered_accs = _remove_confidence_interval_outliers(
            speeds, accs, 0.95,
        )
        assert np.array_equal(filtered_speeds, speeds)
        assert np.array_equal(filtered_accs, accs)

    def test_returns_input_when_speeds_constant(self):
        speeds, accs = np.full(4, 5.0), np.array([1.0, 2.0, 3.0, 4.0])
        filtered_speeds, filtered_accs = _remove_confidence_interval_outliers(
            speeds, accs, 0.95,
        )
        assert np.array_equal(filtered_speeds, speeds)
        assert np.array_equal(filtered_accs, accs)

    def test_returns_input_when_all_points_outside_confidence_band(self):
        speeds = np.array([1.0, 2.0, 3.0, 4.0])
        accs = np.array([100.0, -100.0, 100.0, -100.0])
        filtered_speeds, filtered_accs = _remove_confidence_interval_outliers(
            speeds, accs, 0.01,
        )
        assert np.array_equal(filtered_speeds, speeds)
        assert np.array_equal(filtered_accs, accs)

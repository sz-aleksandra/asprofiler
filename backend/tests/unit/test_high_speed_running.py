from __future__ import annotations

import numpy as np

from app.services.analysis.modules.high_speed_running import build_high_speed_running_mask


class TestBuildHighSpeedRunningMask:
    def test_marks_only_samples_above_speed_threshold(self, sprint_series):
        mask = build_high_speed_running_mask(
            sprint_series, min_high_speed_running_speed=5.0, min_duration=1.0,
        )
        assert mask.dtype == bool
        assert mask.shape == sprint_series.speeds.shape
        assert np.all(sprint_series.speeds[mask] >= 5.0)
        assert mask.any()

    def test_all_false_when_speed_threshold_never_reached(self, flat_series):
        mask = build_high_speed_running_mask(
            flat_series, min_high_speed_running_speed=10.0, min_duration=0.1,
        )
        assert not mask.any()

    def test_all_false_when_min_duration_never_reached(self, sprint_series):
        mask = build_high_speed_running_mask(
            sprint_series, min_high_speed_running_speed=5.0, min_duration=1000.0,
        )
        assert not mask.any()

from __future__ import annotations

import numpy as np

from app.services.analysis.modules.pitch_zones import (
    SCOPES,
    ZONE_MODES,
    build_zone_scope_stats,
)


class TestBuildZoneScopeStats:
    def test_returns_full_zone_scope_matrix(self, sprint_series):
        sample_count = len(sprint_series.speeds)
        all_true_mask = np.ones(sample_count, dtype=bool)
        all_false_mask = np.zeros(sample_count, dtype=bool)
        zone_scope_masks = {
            zone: {
                scope: (all_true_mask if scope == "all" else all_false_mask)
                for scope in SCOPES
            }
            for zone in ZONE_MODES
        }
        zone_scope_stats = build_zone_scope_stats(sprint_series, zone_scope_masks)
        assert set(zone_scope_stats.keys()) == set(ZONE_MODES)
        for scope_stats in zone_scope_stats.values():
            assert set(scope_stats.keys()) == set(SCOPES)
            assert scope_stats["all"]["speed"]["mean"] is not None
            assert scope_stats["high_speed_running"]["speed"]["mean"] is None

    def test_empty_mask_yields_none_stats_and_zero_duration(self, sprint_series):
        all_false_mask = np.zeros(len(sprint_series.speeds), dtype=bool)
        zone_scope_stats = build_zone_scope_stats(
            sprint_series, {"full": {"all": all_false_mask}},
        )
        stats = zone_scope_stats["full"]["all"]
        assert stats["duration"] == 0
        assert stats["speed"] == {
            "min": None, "mean": None, "median": None, "max": None, "area": 0,
        }
        assert stats["acc"]["mean"] is None
        assert stats["dec"]["mean"] is None

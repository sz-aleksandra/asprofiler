from __future__ import annotations

import numpy as np

from app.services.analysis.modules.event_detection import find_direction_events


class TestFindDirectionEvents:
    def test_detects_acceleration_event_on_sprint(self, sprint_series):
        events = find_direction_events(
            sprint_series, "acc", min_start_value=1.5, min_event_duration=0.3,
        )
        assert len(events) == 1
        assert events[0]["duration"] >= 0.3
        assert events[0]["exit_speed"] > events[0]["entry_speed"]

    def test_detects_deceleration_event_on_sprint(self, sprint_series):
        events = find_direction_events(
            sprint_series, "dec", min_start_value=-1.5, min_event_duration=0.3,
        )
        assert len(events) == 1
        assert events[0]["exit_speed"] < events[0]["entry_speed"]

    def test_returns_no_events_on_flat_series(self, flat_series):
        assert find_direction_events(
            flat_series, "acc", min_start_value=1.5, min_event_duration=0.3,
        ) == []

    def test_returns_no_events_when_scope_mask_all_false(self, sprint_series):
        scope_mask = np.zeros(len(sprint_series.speeds), dtype=bool)
        assert find_direction_events(
            sprint_series, "acc", min_start_value=1.5, min_event_duration=0.3,
            scope_mask=scope_mask,
        ) == []

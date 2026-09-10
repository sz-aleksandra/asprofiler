from __future__ import annotations

import numpy as np

from app.services.analysis.modules.pitch_zones import SCOPES, ZONE_MODES
from app.services.analysis.types import Axis

_BIN_BASELINE_MASS = 75.0

_ACC_BINS = {
    "classic": [
        (0.0, 2.5),
        (2.5, 3.5),
        (3.5, None),
    ],
    "detailed": [
        (0.0, 3.0),
        (3.0, 4.0),
        (4.0, 5.0),
        (5.0, 6.0),
        (6.0, 7.0),
        (7.0, None),
    ],
}

_FORCE_BINS = {
    mode: [
        (
            lower_bound * _BIN_BASELINE_MASS,
            upper_bound * _BIN_BASELINE_MASS if upper_bound is not None else None,
        )
        for lower_bound, upper_bound in ranges
    ]
    for mode, ranges in _ACC_BINS.items()
}

_AXIS_BINS = {"acc": _ACC_BINS, "force": _FORCE_BINS}

_PHASE_MEAN_FIELDS = (
    "duration",
    "distance",
    "mean_magnitude",
    "peak_magnitude",
    "mean_relative_power_w_per_kg",
    "peak_relative_power_w_per_kg",
    "impulse",
)
_EVENT_MEAN_FIELDS = (
    "peak_magnitude",
    "duration",
    "distance",
    "horizontal_impulse",
    "entry_speed",
    "exit_speed",
)

_PHASES = ("early", "late")


def _is_event_in_bin(event, axis: Axis, lower_bound, upper_bound: float | None, body_mass):
    peak_magnitude = event["peak_magnitude"]
    value = peak_magnitude * body_mass if axis == "force" else peak_magnitude
    return value >= lower_bound and (upper_bound is None or value < upper_bound)


def _calculate_mean_or_none(events: list[dict], key) -> float | None:
    return float(np.mean([event[key] for event in events])) if events else None


def _summarize_event_subset(events: list[dict], opposite_events: list[dict], duration_min):
    stats = {
        "count": len(events),
        "density_per_min": (len(events) / duration_min) if duration_min > 0 else None,
        "ratio_to_opposite": (len(events) / len(opposite_events)) if len(opposite_events) > 0 else None,
        "mean_magnitude": _calculate_mean_or_none(events, "mean_magnitude"),
        "mean_relative_power_w_per_kg": _calculate_mean_or_none(events, "mean_relative_power_w_per_kg"),
    }
    for field in _EVENT_MEAN_FIELDS:
        stats[f"mean_{field}"] = _calculate_mean_or_none(events, field)
    for phase in _PHASES:
        for field in _PHASE_MEAN_FIELDS:
            stats[f"mean_{phase}_{field}"] = _calculate_mean_or_none(events, f"{phase}_{field}")
    return stats


def _summarize_zone_events(
    events: list[dict],
    opposite_events: list[dict],
    duration,
    body_mass,
):
    duration_min = duration / 60
    stats = _summarize_event_subset(events, opposite_events, duration_min)

    bins = {
        mode: {
            axis: [
                _summarize_event_subset(
                    [
                        event
                        for event in events
                        if _is_event_in_bin(event, axis, lower_bound, upper_bound, body_mass)
                    ],
                    [
                        event
                        for event in opposite_events
                        if _is_event_in_bin(event, axis, lower_bound, upper_bound, body_mass)
                    ],
                    duration_min,
                )
                for lower_bound, upper_bound in _AXIS_BINS[axis][mode]
            ]
            for axis in _AXIS_BINS
        }
        for mode in _ACC_BINS
    }

    return {
        "events": events,
        "stats": stats,
        "bins": bins,
    }


def build_direction_event_summaries(
    events_by_zone: dict,
    opposite_events_by_zone: dict,
    zone_scope_stats,
    body_mass,
):
    return {
        zone: {
            scope: _summarize_zone_events(
                events_by_zone[zone][scope],
                opposite_events_by_zone[zone][scope],
                zone_scope_stats[zone][scope]["duration"],
                body_mass,
            )
            for scope in SCOPES
        }
        for zone in ZONE_MODES
    }

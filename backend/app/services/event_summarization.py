from __future__ import annotations

import numpy as np

from app.services.event_detection import ACCELERATION_END_VALUE, DECELERATION_END_VALUE

EVENT_BIN_CONFIGS = {
    "classic": [
        ("Low", 1.5, 2.5),
        ("High", 2.5, 3.5),
        ("VeryHigh", 3.5, None),
    ],
    "detailed": [
        ("3-4", 3.0, 4.0),
        ("4-5", 4.0, 5.0),
        ("5-6", 5.0, 6.0),
        ("6-7", 6.0, 7.0),
        (">7", 7.0, None),
    ],
}

PHASE_FIELDS = (
    "duration",
    "distance",
    "mean_magnitude",
    "peak_magnitude",
    "mean_power",
    "peak_power",
    "impulse",
)
EVENT_MEAN_FIELDS = (
    "peak_magnitude",
    "duration",
    "distance",
    "horizontal_braking_impulse",
)


def _matches_event_bin(peak_magnitude: float, lower: float, upper: float | None) -> bool:
    if peak_magnitude < lower:
        return False
    if upper is None:
        return True
    return peak_magnitude < upper


def _mean_or_none(events: list[dict], key: str) -> float | None:
    return float(np.mean([event[key] for event in events])) if events else None


def summarize_event_subset(events: list[dict], total_minutes: float) -> dict:
    mean_average_acceleration_magnitude = (
        float(np.mean([abs(event["mean_acceleration"]) for event in events])) if events else None
    )
    mean_entry_speed = _mean_or_none(events, "entry_speed")
    mean_exit_speed = _mean_or_none(events, "exit_speed")
    mean_event_speed = (
        ((mean_entry_speed + mean_exit_speed) / 2)
        if mean_entry_speed is not None and mean_exit_speed is not None
        else None
    )

    summary = {
        "count": len(events),
        "density_per_minute": (len(events) / total_minutes) if total_minutes > 0 else None,
        "total_duration": float(sum(event["duration"] for event in events)),
        "total_distance": float(sum(event["distance"] for event in events)),
        "mean_average_acceleration_magnitude": mean_average_acceleration_magnitude,
        "mean_entry_speed": mean_entry_speed,
        "mean_exit_speed": mean_exit_speed,
        "mean_horizontal_power_per_kilogram": (
            mean_average_acceleration_magnitude * mean_event_speed
            if mean_average_acceleration_magnitude is not None and mean_event_speed is not None
            else None
        ),
    }
    for field in EVENT_MEAN_FIELDS:
        summary[f"mean_{field}"] = _mean_or_none(events, field)
    for phase in ("first_phase", "second_phase"):
        for field in PHASE_FIELDS:
            summary[f"mean_{phase}_{field}"] = _mean_or_none(events, f"{phase}_{field}")
    return summary


def _summarize_scope(
    events: list[dict],
    opposite_events: list[dict],
    duration_seconds: float,
) -> dict:
    duration_minutes = duration_seconds / 60 if duration_seconds > 0 else 0.0
    summary = summarize_event_subset(events, duration_minutes)
    summary["ratio_to_opposite"] = (
        len(events) / len(opposite_events) if len(opposite_events) > 0 else None
    )

    bins: dict[str, list[dict]] = {}
    for bin_mode, config in EVENT_BIN_CONFIGS.items():
        rows = []
        for label, lower, upper in config:
            bin_events = [
                event for event in events if _matches_event_bin(float(event["peak_magnitude"]), lower, upper)
            ]
            opposite_bin_events = [
                event for event in opposite_events if _matches_event_bin(float(event["peak_magnitude"]), lower, upper)
            ]
            row = summarize_event_subset(bin_events, duration_minutes)
            row["ratio_to_opposite"] = (
                len(bin_events) / len(opposite_bin_events) if len(opposite_bin_events) > 0 else None
            )
            rows.append({"bin": label, "lower": lower, "upper": upper, **row})
        bins[bin_mode] = rows

    return {
        "duration_seconds": duration_seconds,
        "events": events,
        "summary": summary,
        "bins": bins,
    }


def summarize_directional_events(
    direction: str,
    events_by_scope: dict[str, dict[str, list[dict]]],
    opposite_events_by_scope: dict[str, dict[str, list[dict]]],
    duration_seconds_by_scope: dict[str, dict[str, float]],
    body_mass_kg: float,
    minimum_acceleration_for_event_start: float,
    minimum_deceleration_for_event_start: float,
    minimum_event_duration_seconds: float,
    minimum_high_speed_running_duration_seconds: float,
    minimum_high_speed_running_speed_meters_per_second: float,
) -> dict:
    scope_keys = ("global", "left", "middle", "right")
    sub_keys = ("all", "high_speed_running")

    scopes: dict[str, dict[str, dict]] = {}
    for scope_key in scope_keys:
        scopes[scope_key] = {}
        for sub_key in sub_keys:
            scoped_events = events_by_scope.get(scope_key, {}).get(sub_key, [])
            scoped_opposite_events = opposite_events_by_scope.get(scope_key, {}).get(sub_key, [])
            scoped_duration_seconds = float(
                duration_seconds_by_scope.get(scope_key, {}).get(sub_key, 0.0) or 0.0
            )
            scopes[scope_key][sub_key] = _summarize_scope(
                scoped_events,
                scoped_opposite_events,
                scoped_duration_seconds,
            )

    global_all_events = events_by_scope.get("global", {}).get("all", [])

    return {
        "config": {
            "direction": direction,
            "minimum_value_for_event_start": (
                minimum_deceleration_for_event_start if direction == "deceleration" else minimum_acceleration_for_event_start
            ),
            "end_value_for_event_finish": (
                DECELERATION_END_VALUE if direction == "deceleration" else ACCELERATION_END_VALUE
            ),
            "minimum_event_duration_seconds": minimum_event_duration_seconds,
            "minimum_high_speed_running_duration_seconds": minimum_high_speed_running_duration_seconds,
            "minimum_high_speed_running_speed_meters_per_second": minimum_high_speed_running_speed_meters_per_second,
            "minimum_high_speed_running_speed_kilometers_per_hour": (
                minimum_high_speed_running_speed_meters_per_second * 3.6
            ),
            "body_mass_kg": body_mass_kg,
            "bins": {
                bin_mode: [{"label": label, "lower": lower, "upper": upper} for label, lower, upper in config]
                for bin_mode, config in EVENT_BIN_CONFIGS.items()
            },
        },
        "events": global_all_events,
        "scopes": scopes,
    }

from __future__ import annotations

import numpy as np

from app.services.analysis.schemas import AnalysisParams, GpsSeries
from app.services.analysis.types import Direction
from app.services.analysis.modules.event_detection import find_direction_events
from app.services.analysis.modules.event_summarization import build_direction_event_summaries
from app.services.analysis.modules.high_speed_running import build_high_speed_running_mask
from app.services.analysis.modules.pitch_zones import (
    ZONES,
    build_zone_scope_stats,
)
from app.services.analysis.modules.sample_distributions import build_sample_distributions
from app.services.analysis.modules.acc_dec_profiles import PointLabel, build_acc_dec_profile
from app.utils.pitch import (
    PitchProjectionContext,
    build_zone_mask,
    build_pitch_zone_labels,
    project_pitch_points,
)


def _build_run_length_encoding(point_labels: list[PointLabel]) -> list[list]:
    encoded_labels = []
    current_label = point_labels[0]
    label_count = 1
    for label in point_labels[1:]:
        if label == current_label:
            label_count += 1
        else:
            encoded_labels.append([current_label, label_count])
            current_label = label
            label_count = 1
    encoded_labels.append([current_label, label_count])
    return encoded_labels


_UNROUNDED_KEYS = frozenset({
    "lats", "lons",
    "acc_profile_fit", "dec_profile_fit",
})


def _round_recursively(data):
    if isinstance(data, dict):
        return {
            key: value if key in _UNROUNDED_KEYS else _round_recursively(value)
            for key, value in data.items()
        }
    if isinstance(data, list):
        return [_round_recursively(item) for item in data]
    if isinstance(data, float):
        return round(data, 3)
    return data


def _find_zone_scope_direction_events(
    series: GpsSeries,
    direction: Direction,
    min_start_value,
    min_event_duration,
    zone_scope_masks: dict,
) -> dict:
    return {
        zone: {
            scope: find_direction_events(
                series, direction,
                min_start_value,
                min_event_duration,
                scope_mask=mask,
            )
            for scope, mask in scope_masks.items()
        }
        for zone, scope_masks in zone_scope_masks.items()
    }


def _build_zone_scope_masks(
    sample_count,
    zones: np.ndarray,
    high_speed_running_mask: np.ndarray,
) -> dict:
    zone_scope_masks = {
        "full": {
            "all": np.ones(sample_count, dtype=bool),
            "high_speed_running": high_speed_running_mask,
        }
    }
    for zone in ZONES:
        zone_mask = build_zone_mask(zones, zone)
        zone_scope_masks[zone] = {
            "all": zone_mask,
            "high_speed_running": zone_mask & high_speed_running_mask,
        }
    return zone_scope_masks


def build_analysis(
    series: GpsSeries,
    params: AnalysisParams,
    pitch_context: PitchProjectionContext,
):
    x, y = project_pitch_points(series.lats, series.lons, pitch_context)
    zones = build_pitch_zone_labels(x)

    high_speed_running_mask = build_high_speed_running_mask(
        series,
        params.min_high_speed_running_speed_m_per_s,
        params.min_high_speed_running_duration_s,
    )
    zone_scope_masks = _build_zone_scope_masks(len(series.relative_times), zones, high_speed_running_mask)

    zone_scope_stats = build_zone_scope_stats(series, zone_scope_masks)
    acc_events = _find_zone_scope_direction_events(
        series, "acc",
        params.min_acc_start_m_per_s2,
        params.min_event_duration_s, zone_scope_masks,
    )
    dec_events = _find_zone_scope_direction_events(
        series, "dec",
        params.min_dec_start_m_per_s2,
        params.min_event_duration_s, zone_scope_masks,
    )
    acc_profile = build_acc_dec_profile("acc", series, params)
    dec_profile = build_acc_dec_profile("dec", series, params)

    return _round_recursively({
        "acc_profile_fit": acc_profile.fit,
        "dec_profile_fit": dec_profile.fit,
        "acc_events": build_direction_event_summaries(
            acc_events, dec_events, zone_scope_stats, params.body_mass_kg
        ),
        "dec_events": build_direction_event_summaries(
            dec_events, acc_events, zone_scope_stats, params.body_mass_kg
        ),
        "time_series": {
            "start_time": series.absolute_times[0],
            "relative_times": series.relative_times.tolist(),
            "speeds": series.speeds.tolist(),
            "accs": series.accs.tolist(),
            "acc_labels": _build_run_length_encoding(acc_profile.point_labels),
            "dec_labels": _build_run_length_encoding(dec_profile.point_labels),
            "x": x.tolist(),
            "y": y.tolist(),
        },
        "sample_stats": zone_scope_stats,
        "sample_distributions": build_sample_distributions(series.speeds, zone_scope_masks),
        "meta": params.model_dump(),
    })

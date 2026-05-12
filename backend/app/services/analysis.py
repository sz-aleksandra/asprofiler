from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from app.schemas.analysis import AnalyzeParameters
from app.services.event_detection import (
    detect_directional_events,
    detect_directional_events_in_windows,
)
from app.services.event_summarization import summarize_directional_events
from app.services.hsr import detect_high_speed_running_windows, detect_per_zone_hsr_windows
from app.services.pitch_zones import (
    ZONE_NAMES,
    build_statistics_rows,
    build_x_by_index,
    build_zone_by_index,
    summarize_pitch_zone_stats,
    tag_events_with_zone,
)
from app.services.sample_distributions import summarize_sample_distributions
from app.services.profiles import Profile, build_profile
from app.utils.math import curve_area, stats


def resolve_file_parameters(
    file_name: str,
    default_parameters: AnalyzeParameters,
    per_file_parameters: dict[str, dict],
) -> AnalyzeParameters:
    return AnalyzeParameters(
        **(per_file_parameters.get(file_name) or default_parameters.model_dump())
    )


@dataclass
class _DirectionConfig:
    direction: str
    minimum_value_for_event_start: float
    minimum_event_duration_seconds: float


def _detect_events_for_direction(
    times: np.ndarray,
    speeds: np.ndarray,
    accelerations: np.ndarray,
    absolute_times: list[str] | None,
    latitudes: list[float | None] | None,
    longitudes: list[float | None] | None,
    body_mass_kg: float,
    config: _DirectionConfig,
    x_by_index: dict[int, float] | None,
    global_high_speed_running_windows: list[tuple[int, int]],
    per_zone_high_speed_running_windows: dict[str, list[tuple[int, int]]],
) -> dict[str, dict[str, list[dict]]]:
    common_args = (times, speeds, accelerations, absolute_times, latitudes, longitudes, body_mass_kg, config.direction)
    detect_args = (config.minimum_value_for_event_start, config.minimum_event_duration_seconds)

    global_all = tag_events_with_zone(
        detect_directional_events(*common_args, *detect_args),
        x_by_index,
    )
    global_hsr = tag_events_with_zone(
        detect_directional_events_in_windows(*common_args, *detect_args, global_high_speed_running_windows),
        x_by_index,
    )

    events_by_scope: dict[str, dict[str, list[dict]]] = {
        "global": {"all": global_all, "high_speed_running": global_hsr},
    }
    for zone_name in ZONE_NAMES:
        zone_hsr = tag_events_with_zone(
            detect_directional_events_in_windows(
                *common_args, *detect_args, per_zone_high_speed_running_windows.get(zone_name, []),
            ),
            x_by_index,
            forced_zone=zone_name,
        )
        events_by_scope[zone_name] = {
            "all": [event for event in global_all if event.get("pitch_zone") == zone_name],
            "high_speed_running": zone_hsr,
        }
    return events_by_scope


def _duration_seconds_by_scope(pitch_zone_stats: dict) -> dict[str, dict[str, float]]:
    def get_seconds(scope: str, zone_key: str) -> float:
        return float(pitch_zone_stats.get(scope, {}).get(zone_key, {}).get("duration_seconds", 0.0) or 0.0)

    scope_to_pzs_zone = {"global": "full", "left": "left", "middle": "middle", "right": "right"}
    return {
        scope_key: {sub: get_seconds(sub, zone_key) for sub in ("all", "high_speed_running")}
        for scope_key, zone_key in scope_to_pzs_zone.items()
    }


def _build_response(
    times: np.ndarray,
    speeds: np.ndarray,
    accelerations: np.ndarray,
    absolute_times: list[str] | None,
    latitudes: list[float | None] | None,
    longitudes: list[float | None] | None,
    parameters: AnalyzeParameters,
    acceleration_profile: Profile,
    deceleration_profile: Profile,
    acceleration_events_summary: dict,
    deceleration_events_summary: dict,
    pitch_zone_stats: dict,
    high_speed_running_windows: list[tuple[int, int]],
) -> dict:
    acceleration_classification = acceleration_profile.point_classifications
    deceleration_classification = deceleration_profile.point_classifications
    n = len(times)
    points = [
        {
            "index": i,
            "time": float(times[i]),
            "absolute_time": absolute_times[i] if absolute_times and i < len(absolute_times) else "",
            "speed": float(speeds[i]),
            "acceleration": float(accelerations[i]),
            "acceleration_classification": acceleration_classification[i] if i < len(acceleration_classification) else "excluded",
            "deceleration_classification": deceleration_classification[i] if i < len(deceleration_classification) else "excluded",
        }
        for i in range(n)
    ]

    return {
        "acceleration_profile": {"fit": acceleration_profile.fit, "meta": acceleration_profile.meta},
        "deceleration_profile": {"fit": deceleration_profile.fit, "meta": deceleration_profile.meta},
        "points": points,
        "acceleration_events": acceleration_events_summary,
        "deceleration_events": deceleration_events_summary,
        "fit": acceleration_profile.fit,
        "timeseries": {
            "time": absolute_times if absolute_times and len(absolute_times) == len(times) else [],
            "relative_time": times.tolist(),
            "speed": speeds.tolist(),
            "acceleration": accelerations.tolist(),
            **({"latitude": latitudes} if latitudes and len(latitudes) == len(times) else {}),
            **({"longitude": longitudes} if longitudes and len(longitudes) == len(times) else {}),
        },
        "stats": {
            "speed": {
                **stats(speeds),
                "area": curve_area(times, speeds),
            },
            "acceleration": {
                **stats(accelerations[accelerations > 0]),
                "area": curve_area(times, np.where(accelerations > 0, accelerations, 0.0)),
            },
            "deceleration": {
                **stats(np.abs(accelerations[accelerations < 0])),
                "area": curve_area(times, np.where(accelerations < 0, np.abs(accelerations), 0.0)),
            },
        },
        "pitch_zone_stats": pitch_zone_stats,
        "statistics_rows": build_statistics_rows(pitch_zone_stats),
        "sample_distributions": summarize_sample_distributions(
            speeds,
            accelerations,
            latitudes,
            longitudes,
            float(parameters.min_speed),
            high_speed_running_windows,
        ),
        "meta": {
            "min_speed": float(parameters.min_speed),
            "deceleration_min_speed": float(parameters.deceleration_min_speed),
            "bin_size": float(parameters.bin_size),
            "extreme_n": int(parameters.extreme_n),
            "confidence_level": float(parameters.confidence_level),
            "body_mass_kg": float(parameters.body_mass_kg),
            "minimum_acceleration_for_event_start": float(parameters.minimum_acceleration_for_event_start),
            "minimum_deceleration_for_event_start": float(parameters.minimum_deceleration_for_event_start),
            "minimum_event_duration_seconds": float(parameters.minimum_event_duration_seconds),
            "minimum_high_speed_running_duration_seconds": float(parameters.minimum_high_speed_running_duration_seconds),
            "minimum_high_speed_running_speed_meters_per_second": float(
                parameters.minimum_high_speed_running_speed_meters_per_second
            ),
        },
    }


def build_as_profile(
    times: np.ndarray,
    speeds: np.ndarray,
    accelerations: np.ndarray,
    absolute_times: list[str] | None,
    latitudes: list[float | None] | None,
    longitudes: list[float | None] | None,
    parameters: AnalyzeParameters,
):
    minimum_speed = float(parameters.min_speed)
    body_mass_kg = float(parameters.body_mass_kg)
    hsr_speed = float(parameters.minimum_high_speed_running_speed_meters_per_second)
    hsr_duration = float(parameters.minimum_high_speed_running_duration_seconds)
    event_duration = float(parameters.minimum_event_duration_seconds)

    zone_by_index = build_zone_by_index(latitudes, longitudes, speeds, minimum_speed)
    x_by_index = build_x_by_index(latitudes, longitudes, speeds, minimum_speed)

    high_speed_running_windows = detect_high_speed_running_windows(times, speeds, hsr_speed, hsr_duration)
    per_zone_high_speed_running_windows = detect_per_zone_hsr_windows(
        times, speeds, zone_by_index, hsr_speed, hsr_duration,
    )

    acceleration_config = _DirectionConfig(
        "acceleration", float(parameters.minimum_acceleration_for_event_start), event_duration,
    )
    deceleration_config = _DirectionConfig(
        "deceleration", float(parameters.minimum_deceleration_for_event_start), event_duration,
    )

    detect_args = (
        times, speeds, accelerations, absolute_times, latitudes, longitudes,
        body_mass_kg,
    )
    acceleration_events_by_scope = _detect_events_for_direction(
        *detect_args, acceleration_config, x_by_index,
        high_speed_running_windows, per_zone_high_speed_running_windows,
    )
    deceleration_events_by_scope = _detect_events_for_direction(
        *detect_args, deceleration_config, x_by_index,
        high_speed_running_windows, per_zone_high_speed_running_windows,
    )

    acceleration_profile = build_profile("acceleration", times, speeds, accelerations, parameters)
    deceleration_profile = build_profile("deceleration", times, speeds, accelerations, parameters)

    pitch_zone_stats = summarize_pitch_zone_stats(
        times, speeds, accelerations, latitudes, longitudes, minimum_speed,
        high_speed_running_windows, per_zone_high_speed_running_windows,
    )
    duration_seconds_by_scope = _duration_seconds_by_scope(pitch_zone_stats)

    summarize_args = (
        body_mass_kg,
        acceleration_config.minimum_value_for_event_start,
        deceleration_config.minimum_value_for_event_start,
        event_duration, hsr_duration, hsr_speed,
    )
    acceleration_events_summary = summarize_directional_events(
        "acceleration", acceleration_events_by_scope, deceleration_events_by_scope,
        duration_seconds_by_scope, *summarize_args,
    )
    deceleration_events_summary = summarize_directional_events(
        "deceleration", deceleration_events_by_scope, acceleration_events_by_scope,
        duration_seconds_by_scope, *summarize_args,
    )

    return _build_response(
        times, speeds, accelerations, absolute_times, latitudes, longitudes, parameters,
        acceleration_profile, deceleration_profile,
        acceleration_events_summary, deceleration_events_summary,
        pitch_zone_stats, high_speed_running_windows,
    )

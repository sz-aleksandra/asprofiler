from __future__ import annotations

from statistics import NormalDist
from typing import Literal

import numpy as np
from pydantic import BaseModel

from app.schemas.analysis import AnalyzeParameters

ProfileMode = Literal["acceleration", "deceleration"]
PointClassification = Literal["selected", "included", "excluded"]


class LinearFit(BaseModel):
    intercept: float
    slope: float
    zero_crossing_speed: float
    r_squared: float


class Profile(BaseModel):
    point_classifications: list[PointClassification]
    fit: LinearFit | None
    meta: dict


def _select_points(
    speeds: np.ndarray,
    accelerations: np.ndarray,
    candidate_indices: np.ndarray,
    minimum_speed: float,
    bin_size: float,
    extreme_n: int,
    mode: ProfileMode,
) -> np.ndarray:
    if len(candidate_indices) == 0:
        return np.array([], dtype=int)

    candidate_speeds = speeds[candidate_indices]
    candidate_accelerations = accelerations[candidate_indices]
    maximum_speed = float(np.max(candidate_speeds))

    bin_edges = np.arange(minimum_speed, maximum_speed + bin_size, bin_size)

    picked_indices = []
    last_index = len(bin_edges) - 1
    for bin_index, (lower_bound, upper_bound) in enumerate(zip(bin_edges, bin_edges + bin_size)):
        if bin_index == last_index:
            bin_mask = (candidate_speeds >= lower_bound) & (candidate_speeds <= upper_bound)
        else:
            bin_mask = (candidate_speeds >= lower_bound) & (candidate_speeds < upper_bound)
        if not np.any(bin_mask):
            continue
        bin_accelerations = candidate_accelerations[bin_mask]
        bin_indices = candidate_indices[bin_mask]
        order = np.argsort(bin_accelerations)
        if mode == "acceleration":
            order = order[::-1]
        for selected_index in order[:extreme_n]:
            picked_indices.append(int(bin_indices[selected_index]))

    return np.array(picked_indices, dtype=int)


def _fit_line(x_values: np.ndarray, y_values: np.ndarray) -> tuple[float, float]:
    if len(x_values) < 2:
        raise ValueError("Not enough points to fit")
    slope, intercept = np.polyfit(x_values, y_values, 1)
    return float(intercept), float(slope)


def _r2_score(y_values: np.ndarray, y_hat: np.ndarray) -> float:
    residual_sum_of_squares = float(np.sum((y_values - y_hat) ** 2))
    total_sum_of_squares = float(np.sum((y_values - np.mean(y_values)) ** 2))
    if total_sum_of_squares == 0:
        return 0.0
    return 1.0 - (residual_sum_of_squares / total_sum_of_squares)


def _apply_confidence_interval_filter(
    x_values: np.ndarray,
    y_values: np.ndarray,
    intercept: float,
    slope: float,
    z_score: float,
) -> tuple[np.ndarray, np.ndarray]:
    if len(x_values) <= 2:
        return x_values, y_values
    residuals = y_values - (intercept + slope * x_values)
    sigma = float(np.sqrt(np.sum(residuals ** 2) / (len(x_values) - 2)))
    if sigma == 0:
        return x_values, y_values
    keep_mask = np.abs(residuals) <= (z_score * sigma)
    if not np.any(keep_mask):
        return x_values, y_values
    return x_values[keep_mask], y_values[keep_mask]


def _classify_points(
    total: int, included: np.ndarray, selected: np.ndarray,
) -> list[PointClassification]:
    classifications: list[PointClassification] = ["excluded"] * total
    for index in included:
        classifications[int(index)] = "included"
    for index in selected:
        classifications[int(index)] = "selected"
    return classifications


def build_profile(
    mode: ProfileMode,
    times: np.ndarray,
    speeds: np.ndarray,
    accelerations: np.ndarray,
    parameters: AnalyzeParameters,
) -> Profile:
    minimum_speed = float(parameters.min_speed if mode == "acceleration" else parameters.deceleration_min_speed)
    sign_mask = accelerations > 0 if mode == "acceleration" else accelerations < 0
    meta = {
        "min_speed": minimum_speed,
        "bin_size": float(parameters.bin_size),
        "extreme_n": int(parameters.extreme_n),
        "confidence_level": float(parameters.confidence_level),
        "body_mass_kg": float(parameters.body_mass_kg),
    }

    pre_filtered_indices = np.where(sign_mask & (speeds >= minimum_speed))[0]

    selected_indices = _select_points(
        speeds,
        accelerations,
        pre_filtered_indices,
        minimum_speed=minimum_speed,
        bin_size=parameters.bin_size,
        extreme_n=parameters.extreme_n,
        mode=mode,
    )

    if len(selected_indices) < 2:
        return Profile(
            point_classifications=_classify_points(len(times), pre_filtered_indices, np.array([], dtype=int)),
            fit=None,
            meta=meta,
        )

    selected_speeds = speeds[selected_indices]
    selected_accelerations = accelerations[selected_indices]

    intercept, slope = _fit_line(selected_speeds, selected_accelerations)

    z_score = float(NormalDist().inv_cdf(0.5 + float(parameters.confidence_level) / 2))
    refit_speeds, refit_accelerations = _apply_confidence_interval_filter(
        selected_speeds, selected_accelerations, intercept, slope, z_score=z_score,
    )
    if 2 <= len(refit_speeds) < len(selected_speeds):
        intercept, slope = _fit_line(refit_speeds, refit_accelerations)
        selected_speeds, selected_accelerations = refit_speeds, refit_accelerations

    predicted = intercept + slope * selected_speeds
    fit = LinearFit(
        intercept=float(intercept),
        slope=float(slope),
        zero_crossing_speed=float(-intercept / slope) if slope != 0 else float("inf"),
        r_squared=float(_r2_score(selected_accelerations, predicted)),
    )

    return Profile(
        point_classifications=_classify_points(len(times), pre_filtered_indices, selected_indices),
        fit=fit,
        meta=meta,
    )
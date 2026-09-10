from __future__ import annotations

from typing import Literal

import numpy as np
import statsmodels.api as sm
from pydantic import BaseModel

from app.services.analysis.schemas import AnalysisParams, GpsSeries
from app.services.analysis.types import Direction

PointLabel = Literal["s", "i", "e"]


class _LinearFit(BaseModel):
    intercept: float
    slope: float
    zero_crossing_speed: float | None
    r_squared: float


class _AccDecProfile(BaseModel):
    point_labels: list[PointLabel]
    fit: _LinearFit | None


def _find_extreme_points(
    speeds: np.ndarray,
    accs: np.ndarray,
    eligible_indices: np.ndarray,
    min_speed,
    bin_size,
    extreme_count,
    direction: Direction,
) -> np.ndarray:
    if len(eligible_indices) == 0:
        return np.array([], dtype=int)

    eligible_speeds = speeds[eligible_indices]
    eligible_accs = accs[eligible_indices]
    bin_edges = np.arange(min_speed, np.max(eligible_speeds) + bin_size, bin_size)

    selected_indices: list[int] = []
    for lower_bound in bin_edges:
        upper_bound = lower_bound + bin_size
        bin_mask = (eligible_speeds >= lower_bound) & (eligible_speeds < upper_bound)
        if not np.any(bin_mask):
            continue
        candidate_accs = eligible_accs[bin_mask]
        candidate_indices = eligible_indices[bin_mask]
        candidate_order = np.argsort(candidate_accs)
        if direction == "acc":
            candidate_order = candidate_order[::-1]
        selected_indices.extend(candidate_indices[candidate_order[:extreme_count]])

    return np.array(selected_indices, dtype=int)


def _calculate_r_squared_score(selected_accs: np.ndarray, predicted_accs: np.ndarray):
    residual_sum_of_squares = np.sum((selected_accs - predicted_accs) ** 2)
    total_sum_of_squares = np.sum((selected_accs - np.mean(selected_accs)) ** 2)
    if total_sum_of_squares == 0:
        return 0.0
    return float(1.0 - residual_sum_of_squares / total_sum_of_squares)


def _remove_confidence_interval_outliers(
    speeds: np.ndarray,
    accs: np.ndarray,
    confidence_level,
) -> tuple[np.ndarray, np.ndarray]:
    if len(speeds) <= 2:
        return speeds, accs
    if np.sum((speeds - np.mean(speeds)) ** 2) == 0:
        return speeds, accs
    design_matrix = sm.add_constant(speeds)
    prediction = sm.OLS(accs, design_matrix).fit().get_prediction(design_matrix)
    ci = prediction.summary_frame(alpha=1 - confidence_level)
    keep_mask = (accs >= ci["mean_ci_lower"].to_numpy()) & (accs <= ci["mean_ci_upper"].to_numpy())
    if not np.any(keep_mask):
        return speeds, accs
    return speeds[keep_mask], accs[keep_mask]


def _build_point_labels(
    sample_count, candidate_indices: np.ndarray, selected_indices: np.ndarray,
) -> list[PointLabel]:
    labels: list[PointLabel] = ["e"] * sample_count
    for index in candidate_indices:
        labels[index] = "i"
    for index in selected_indices:
        labels[index] = "s"
    return labels


def build_acc_dec_profile(
    direction: Direction,
    series: GpsSeries,
    params: AnalysisParams,
) -> _AccDecProfile:
    speeds = series.speeds
    accs = series.accs
    if direction == "acc":
        min_speed, direction_mask = params.min_acc_speed_m_per_s, accs > 0
    else:
        min_speed, direction_mask = params.min_dec_speed_m_per_s, accs < 0

    candidate_indices = np.where(direction_mask & (speeds >= min_speed))[0]

    selected_indices = _find_extreme_points(
        speeds,
        accs,
        candidate_indices,
        min_speed=min_speed,
        bin_size=params.bin_size_m_per_s,
        extreme_count=params.extreme_count,
        direction=direction,
    )

    sample_count = len(series.relative_times)
    if len(selected_indices) < 2:
        return _AccDecProfile(
            point_labels=_build_point_labels(sample_count, candidate_indices, np.array([], dtype=int)),
            fit=None,
        )

    selected_speeds = speeds[selected_indices]
    selected_accs = accs[selected_indices]

    slope, intercept = np.polyfit(selected_speeds, selected_accs, 1)

    refit_speeds, refit_accs = _remove_confidence_interval_outliers(
        selected_speeds,
        selected_accs,
        confidence_level=params.confidence_level,
    )
    if 2 <= len(refit_speeds) < len(selected_speeds):
        slope, intercept = np.polyfit(refit_speeds, refit_accs, 1)
        selected_speeds, selected_accs = refit_speeds, refit_accs

    predicted_accs = intercept + slope * selected_speeds
    fit = _LinearFit(
        intercept=intercept,
        slope=slope,
        zero_crossing_speed=-intercept / slope if slope != 0 else None,
        r_squared=_calculate_r_squared_score(selected_accs, predicted_accs),
    )

    return _AccDecProfile(
        point_labels=_build_point_labels(sample_count, candidate_indices, selected_indices),
        fit=fit,
    )

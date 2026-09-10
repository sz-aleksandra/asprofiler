from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from pydantic import BaseModel

from app.services.analysis.types import FilterMode


@dataclass
class GpsSeries:
    absolute_times: np.ndarray
    relative_times: np.ndarray
    speeds: np.ndarray
    accs: np.ndarray
    lats: np.ndarray
    lons: np.ndarray


class AnalysisParams(BaseModel):
    min_acc_speed_m_per_s: float
    min_dec_speed_m_per_s: float
    bin_size_m_per_s: float
    extreme_count: int
    confidence_level: float
    body_mass_kg: float
    min_high_speed_running_speed_m_per_s: float
    min_high_speed_running_duration_s: float
    min_acc_start_m_per_s2: float
    min_dec_start_m_per_s2: float
    min_event_duration_s: float


class PreprocessingParams(BaseModel):
    filter_window_samples: int
    filter_mode: FilterMode


class SuccessfulAnalysisResult(BaseModel):
    file_name: str
    analysis: dict


class FailedAnalysisResult(BaseModel):
    file_name: str
    error: str


class AnalysisResults(BaseModel):
    results: list[SuccessfulAnalysisResult | FailedAnalysisResult]

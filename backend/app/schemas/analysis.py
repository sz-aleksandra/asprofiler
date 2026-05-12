from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class GpsSeries(BaseModel):
    absolute_times: list[str]
    relative_times: list[float]
    speeds: list[float]
    accelerations: list[float]
    latitudes: list[float]
    longitudes: list[float]


class AnalyzeParameters(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    min_speed: float = Field(3.0, ge=0)
    deceleration_min_speed: float = Field(3.0, ge=0)
    bin_size: float = Field(0.2, gt=0)
    extreme_n: int = Field(2, ge=1)
    positive_only: bool = True
    confidence_level: float = Field(0.95, gt=0, lt=1)
    body_mass_kg: float = Field(75.0, gt=0)
    minimum_acceleration_for_event_start: float = Field(1.5, gt=0)
    minimum_deceleration_for_event_start: float = Field(-1.5, lt=0)
    minimum_event_duration_seconds: float = Field(0.3, gt=0)
    minimum_high_speed_running_duration_seconds: float = Field(1.0, gt=0)
    minimum_high_speed_running_speed_meters_per_second: float = Field(19.0 / 3.6, gt=0)


class PreprocessingParameters(BaseModel):
    filter_window: int = Field(5, ge=1)
    filter_mode: str = "butterworth"


class AnalyzeResultItemResponse(BaseModel):
    name: str
    profile: dict | None = None
    error: str | None = None


class AnalyzeResultsResponse(BaseModel):
    ok: bool = True
    results: list[AnalyzeResultItemResponse]

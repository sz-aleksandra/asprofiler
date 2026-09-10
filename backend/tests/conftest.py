from __future__ import annotations

import numpy as np
import pytest

from app.services.analysis.schemas import GpsSeries

SAMPLE_RATE_HZ = 10
SAMPLE_TIME_STEP = 1.0 / SAMPLE_RATE_HZ

ANALYSIS_PARAMS_DEFAULTS: dict = {
    "min_acc_speed_m_per_s": 3.0,
    "min_dec_speed_m_per_s": 3.0,
    "bin_size_m_per_s": 0.2,
    "extreme_count": 2,
    "confidence_level": 0.95,
    "body_mass_kg": 75.0,
    "min_acc_start_m_per_s2": 1.5,
    "min_dec_start_m_per_s2": -1.5,
    "min_event_duration_s": 0.3,
    "min_high_speed_running_duration_s": 1.0,
    "min_high_speed_running_speed_m_per_s": 19.0 / 3.6,
}

PREPROCESSING_PARAMS_DEFAULTS: dict = {
    "filter_window_samples": 5,
    "filter_mode": "butterworth",
}


@pytest.fixture
def analysis_params_defaults() -> dict:
    return dict(ANALYSIS_PARAMS_DEFAULTS)


@pytest.fixture
def preprocessing_params_defaults() -> dict:
    return dict(PREPROCESSING_PARAMS_DEFAULTS)


def _format_absolute_time(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    remaining_seconds = seconds - hours * 3600 - minutes * 60
    return f"{hours:02d}:{minutes:02d}:{remaining_seconds:06.3f}"


def _build_sprint_speed_profile(sample_count: int) -> np.ndarray:
    acceleration_length = int(4 * SAMPLE_RATE_HZ)
    cruise_length = int(2 * SAMPLE_RATE_HZ)
    deceleration_length = sample_count - acceleration_length - cruise_length
    return np.concatenate([
        np.linspace(0.0, 8.0, acceleration_length, endpoint=False),
        np.full(cruise_length, 8.0),
        np.linspace(8.0, 0.0, deceleration_length),
    ])


def _build_straight_track_coordinates(sample_count: int) -> tuple[np.ndarray, np.ndarray]:
    random_generator = np.random.default_rng(0)
    lats = 52.0 + random_generator.normal(0, 1e-7, sample_count)
    lons = 21.0 + np.arange(sample_count) * 1e-5
    return lats, lons


def _build_gps_series(sample_count: int, speeds: np.ndarray) -> GpsSeries:
    relative_times = np.arange(sample_count) * SAMPLE_TIME_STEP
    lats, lons = _build_straight_track_coordinates(sample_count)
    absolute_times = np.array(
        [_format_absolute_time(time) for time in relative_times], dtype=object,
    )
    return GpsSeries(
        absolute_times=absolute_times,
        relative_times=relative_times,
        speeds=speeds,
        accs=np.gradient(speeds, relative_times),
        lats=lats,
        lons=lons,
    )


@pytest.fixture
def sprint_series() -> GpsSeries:
    return _build_gps_series(100, _build_sprint_speed_profile(100))


@pytest.fixture
def flat_series() -> GpsSeries:
    return _build_gps_series(50, np.full(50, 1.0))


@pytest.fixture
def sprint_csv_text() -> str:
    sample_count = 100
    relative_times = np.arange(sample_count) * SAMPLE_TIME_STEP
    speeds = _build_sprint_speed_profile(sample_count)
    lats, lons = _build_straight_track_coordinates(sample_count)
    lines = ["time,speed,lat,lon"]
    for relative_time, speed, lat, lon in zip(relative_times, speeds, lats, lons):
        lines.append(f"{_format_absolute_time(relative_time)},{speed:.4f},{lat:.7f},{lon:.7f}")
    return "\n".join(lines) + "\n"


@pytest.fixture
def client(monkeypatch):
    from fastapi.testclient import TestClient

    monkeypatch.setenv("APP_PASSWORD", "test-password")
    monkeypatch.setenv("APP_SESSION_SECRET", "test-secret")

    from app.main import app
    from app.services.auth.deps import require_auth

    app.dependency_overrides[require_auth] = lambda: None
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(require_auth, None)

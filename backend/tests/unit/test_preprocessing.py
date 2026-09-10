from __future__ import annotations

from io import StringIO

import numpy as np
import pytest

from app.services.analysis.modules.preprocessing import (
    PreprocessingError,
    load_gps_series_stream,
    preprocess_series,
)
from app.services.analysis.schemas import PreprocessingParams


def _build_gps_arrays(
    sample_count: int = 30,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    absolute_times = np.array(
        [f"00:00:{index * 0.1:06.3f}" for index in range(sample_count)], dtype=object,
    )
    speeds = np.linspace(0.0, 5.0, sample_count)
    lats = np.full(sample_count, 52.0)
    lons = np.full(sample_count, 21.0)
    return absolute_times, speeds, lats, lons


class TestLoadGpsSeriesStream:
    def test_parses_valid_csv(self):
        csv_text = (
            "time,speed,lat,lon\n"
            "00:00:00.0,1.0,52.0,21.0\n"
            "00:00:00.1,2.0,52.0,21.0\n"
        )
        absolute_times, speeds, lats, lons = load_gps_series_stream(StringIO(csv_text))
        assert absolute_times.tolist() == ["00:00:00.0", "00:00:00.1"]
        assert speeds.tolist() == [1.0, 2.0]
        assert lats.tolist() == [52.0, 52.0]
        assert lons.tolist() == [21.0, 21.0]


class TestPreprocessSeries:
    def test_relative_times_start_at_zero(self):
        series = preprocess_series(
            *_build_gps_arrays(),
            params=PreprocessingParams(filter_window_samples=5, filter_mode="none"),
        )
        assert series.relative_times[0] == 0.0
        assert len(series.speeds) == len(series.relative_times) == len(series.accs)

    def test_drops_non_finite_rows(self):
        absolute_times = np.array(
            ["00:00:00.0", "00:00:00.1", "00:00:00.2"], dtype=object,
        )
        series = preprocess_series(
            absolute_times,
            np.array([1.0, np.nan, 3.0]),
            np.full(3, 52.0),
            np.full(3, 21.0),
            PreprocessingParams(filter_window_samples=5, filter_mode="none"),
        )
        assert len(series.speeds) == 2

    def test_raises_when_all_rows_non_finite(self):
        with pytest.raises(PreprocessingError):
            preprocess_series(
                np.array(["00:00:00.0"], dtype=object),
                np.array([np.nan]),
                np.array([np.nan]),
                np.array([np.nan]),
                PreprocessingParams(filter_window_samples=5, filter_mode="none"),
            )

    def test_raises_when_time_not_strictly_increasing(self):
        absolute_times = np.array(
            ["00:00:00.5", "00:00:00.2", "00:00:00.9"], dtype=object,
        )
        with pytest.raises(PreprocessingError, match="increasing"):
            preprocess_series(
                absolute_times,
                np.array([1.0, 2.0, 3.0]),
                np.full(3, 52.0),
                np.full(3, 21.0),
                PreprocessingParams(filter_window_samples=5, filter_mode="none"),
            )

    def test_raises_when_time_format_invalid(self):
        absolute_times = np.array(["not:a:time", "00:00:00.1"], dtype=object)
        with pytest.raises(PreprocessingError):
            preprocess_series(
                absolute_times,
                np.array([1.0, 2.0]),
                np.full(2, 52.0),
                np.full(2, 21.0),
                PreprocessingParams(filter_window_samples=5, filter_mode="none"),
            )

    def test_raises_when_minute_field_out_of_range(self):
        absolute_times = np.array(["00:99:00.0", "00:00:00.1"], dtype=object)
        with pytest.raises(PreprocessingError):
            preprocess_series(
                absolute_times,
                np.array([1.0, 2.0]),
                np.full(2, 52.0),
                np.full(2, 21.0),
                PreprocessingParams(filter_window_samples=5, filter_mode="none"),
            )

    @pytest.mark.parametrize("filter_mode", ["median", "mean", "median_mean"])
    def test_rolling_filters_preserve_length(self, filter_mode):
        gps_arrays = _build_gps_arrays()
        series = preprocess_series(
            *gps_arrays,
            params=PreprocessingParams(
                filter_mode=filter_mode, filter_window_samples=5,
            ),
        )
        assert len(series.speeds) == len(gps_arrays[0])

    def test_rolling_window_of_one_leaves_speeds_unchanged(self):
        gps_arrays = _build_gps_arrays()
        series = preprocess_series(
            *gps_arrays,
            params=PreprocessingParams(filter_mode="mean", filter_window_samples=1),
        )
        assert np.allclose(series.speeds, gps_arrays[1])

    def test_butterworth_smooths_long_signal(self):
        gps_arrays = _build_gps_arrays(sample_count=200)
        series = preprocess_series(
            *gps_arrays,
            params=PreprocessingParams(
                filter_window_samples=5, filter_mode="butterworth",
            ),
        )
        assert len(series.speeds) == 200
        assert np.all(np.isfinite(series.speeds))

    def test_butterworth_bypasses_when_signal_too_short(self):
        gps_arrays = _build_gps_arrays(sample_count=8)
        series = preprocess_series(
            *gps_arrays,
            params=PreprocessingParams(
                filter_window_samples=5, filter_mode="butterworth",
            ),
        )
        assert np.allclose(series.speeds, gps_arrays[1])

    def test_butterworth_bypasses_when_nyquist_below_cutoff(self):
        sample_count = 30
        absolute_times = np.array(
            [f"00:00:{index * 0.5:06.3f}" for index in range(sample_count)],
            dtype=object,
        )
        speeds = np.linspace(0.0, 5.0, sample_count)
        series = preprocess_series(
            absolute_times,
            speeds,
            np.full(sample_count, 52.0),
            np.full(sample_count, 21.0),
            PreprocessingParams(filter_window_samples=5, filter_mode="butterworth"),
        )
        assert np.allclose(series.speeds, speeds)

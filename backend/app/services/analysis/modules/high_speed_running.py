from __future__ import annotations

import numpy as np

from app.services.analysis.schemas import GpsSeries
from app.utils.pitch import build_window_mask
from app.utils.window_detection import find_windows


def build_high_speed_running_mask(
    series: GpsSeries,
    min_high_speed_running_speed,
    min_duration,
) -> np.ndarray:
    return build_window_mask(
        len(series.speeds),
        find_windows(
            series.relative_times,
            series.speeds,
            start_predicate=lambda value: value >= min_high_speed_running_speed,
            end_predicate=lambda value: value < min_high_speed_running_speed,
            min_duration=min_duration,
        ),
    )

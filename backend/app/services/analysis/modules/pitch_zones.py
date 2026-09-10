from __future__ import annotations

import numpy as np

from app.services.analysis.schemas import GpsSeries
from app.utils.pitch import Zone
from app.utils.math import compute_curve_area, summarize_stats

ZONES = ("left", "middle", "right")
ZONE_MODES = ("full", "left", "middle", "right")
SCOPES = ("all", "high_speed_running")


def _calculate_sample_stats(
    times: np.ndarray,
    speeds: np.ndarray,
    accs: np.ndarray,
    sample_mask: np.ndarray,
):
    acc_mask = sample_mask & (accs > 0)
    dec_mask = sample_mask & (accs < 0)
    abs_accs = np.abs(accs)
    return {
        "duration": compute_curve_area(times, sample_mask),
        "speed": {
            **summarize_stats(speeds[sample_mask]),
            "area": compute_curve_area(times, np.where(sample_mask, speeds, 0.0)),
        },
        "acc": {
            **summarize_stats(accs[acc_mask]),
            "area": compute_curve_area(times, np.where(acc_mask, accs, 0.0)),
        },
        "dec": {
            **summarize_stats(abs_accs[dec_mask]),
            "area": compute_curve_area(times, np.where(dec_mask, abs_accs, 0.0)),
        },
    }


def build_zone_scope_stats(
    series: GpsSeries,
    zone_scope_masks: dict,
):
    return {
        zone: {
            scope: _calculate_sample_stats(
                series.relative_times, series.speeds, series.accs, mask,
            )
            for scope, mask in scope_masks.items()
        }
        for zone, scope_masks in zone_scope_masks.items()
    }

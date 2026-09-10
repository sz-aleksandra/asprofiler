from __future__ import annotations

import numpy as np


def _build_distribution(samples: np.ndarray) -> list[int]:
    if len(samples) == 0:
        return []
    non_negative_samples = np.maximum(samples, 0)
    bin_count = int(np.floor(float(np.max(non_negative_samples)))) + 1
    bin_indices = np.floor(non_negative_samples).astype(int)
    return np.bincount(bin_indices, minlength=bin_count).tolist()


def build_sample_distributions(speeds: np.ndarray, zone_scope_masks: dict):
    return {
        zone: {
            scope: _build_distribution(speeds[mask])
            for scope, mask in scope_masks.items()
        }
        for zone, scope_masks in zone_scope_masks.items()
    }

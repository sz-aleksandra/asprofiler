from __future__ import annotations

from typing import Callable

import numpy as np


def find_windows(
    times: np.ndarray,
    samples: np.ndarray,
    start_predicate: Callable[[float], bool],
    end_predicate: Callable[[float], bool],
    min_duration,
    mask: np.ndarray | None = None,
) -> list[tuple[int, int]]:
    windows: list[tuple[int, int]] = []
    sample_count = len(samples)
    start_index: int | None = None
    for index in range(sample_count):
        sample = samples[index]
        is_sample_included = mask is None or bool(mask[index])
        if start_index is None:
            if is_sample_included and start_predicate(sample):
                start_index = index
            continue
        if not is_sample_included or end_predicate(sample):
            end_index = index - 1
            if times[end_index] - times[start_index] >= min_duration:
                windows.append((start_index, end_index))
            start_index = None

    if start_index is not None:
        end_index = sample_count - 1
        if times[end_index] - times[start_index] >= min_duration:
            windows.append((start_index, end_index))

    return windows

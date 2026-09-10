from __future__ import annotations

from typing import Literal

Direction = Literal["acc", "dec"]
Axis = Literal["acc", "force"]
FilterMode = Literal["none", "butterworth", "median", "mean", "median_mean"]

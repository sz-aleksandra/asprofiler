from __future__ import annotations
import sys
from pathlib import Path

import numpy as np
import pandas as pd

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(BACKEND_DIR))
from app.services.analysis.modules.acc_dec_profiles import build_acc_dec_profile
from app.services.analysis.schemas import AnalysisParams, GpsSeries

CSV = SCRIPT_DIR / "data" / "ishoi_data.csv"

df = pd.read_csv(CSV)
df = df.dropna(subset=["acc"])
speeds = df["speed"].to_numpy(dtype=float)
accs = df["acc"].to_numpy(dtype=float)
lats = df["Latitude"].to_numpy(dtype=float)
lons = df["Longitude"].to_numpy(dtype=float)

n = len(df)
relative_times = np.arange(n, dtype=float) / 10.0
absolute_times = np.array([f"00:00:{t:06.3f}" for t in relative_times], dtype=object)

series = GpsSeries(
    absolute_times=absolute_times,
    relative_times=relative_times,
    speeds=speeds,
    accs=accs,
    lats=lats,
    lons=lons,
)

params = AnalysisParams(
    min_acc_speed_m_per_s=3.0,
    min_dec_speed_m_per_s=3.0,
    bin_size_m_per_s=0.1,
    extreme_count=2,
    confidence_level=0.95,
    body_mass_kg=75.0,
    min_acc_start_m_per_s2=1.0,
    min_dec_start_m_per_s2=1.0,
    min_event_duration_s=0.3,
    min_high_speed_running_duration_s=1.0,
    min_high_speed_running_speed_m_per_s=5.5,
)

profile = build_acc_dec_profile("acc", series, params)
fit = profile.fit
n_selected = sum(1 for label in profile.point_labels if label == "s")
n_intermediate = sum(1 for label in profile.point_labels if label == "i")

print(f"rows_after_na_drop: {n}")
print("=== ASPROFILER (Ishoi data) ===")
print(f"A0 (intercept):        {round(fit.intercept, 2)}")
print(f"vmax:                  {round(-fit.intercept / fit.slope, 2)}")
print(f"R.squared:             {round(fit.r_squared, 3)}")
print(f"n_candidates (i+s):    {n_intermediate + n_selected}")
print(f"n_initial:             {n_selected}")
print(f"intercept (raw):       {fit.intercept:.6f}")
print(f"slope:                 {fit.slope:.7f}")

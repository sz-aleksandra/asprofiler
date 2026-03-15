from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
ANALYSIS_DIR = BASE_DIR / "analysis_store"
ANALYSIS_RETENTION_HOURS = 24 * 7

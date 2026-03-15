from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.storage import cleanup_expired_analyses


def main():
    removed = cleanup_expired_analyses()
    print(f"Removed {len(removed)} analysis file(s)")
    for analysis_id in removed:
        print(analysis_id)


if __name__ == "__main__":
    main()

import argparse
import csv
import math
from pathlib import Path

TIME_COL = "Time"
SPEED_COL = "Speed (m/s)"
ACCEL_COL = "Instantaneous Acceleration Impulse"
def parse_time_to_seconds(value: str) -> float:
    v = value.strip()
    if not v:
        raise ValueError("empty time")
    parts = v.split(":")
    if len(parts) != 3:
        raise ValueError(f"bad time format: {value}")
    h = int(parts[0])
    m = int(parts[1])
    s = float(parts[2])
    return h * 3600 + m * 60 + s


def downsample_csv(input_path: Path, output_path: Path) -> dict:
    seen_rows = set()
    total_rows = 0
    kept_rows = 0
    skipped_dupes = 0
    bad_rows = 0
    first_time_sec = None

    with (
        input_path.open("r", encoding="utf-8-sig", newline="") as src,
        output_path.open("w", encoding="utf-8", newline="") as dst,
    ):
        reader = csv.DictReader(src)
        writer = csv.writer(dst)
        writer.writerow(["time", "absolute_time", "speed", "acceleration"])

        for row in reader:
            total_rows += 1
            try:
                t_raw = row.get(TIME_COL, "")
                s_raw = row.get(SPEED_COL, "")
                a_raw = row.get(ACCEL_COL, "")
                t = str(t_raw).strip()
                s = float(str(s_raw).strip())
                a = float(str(a_raw).strip())
                if math.isnan(s) or math.isnan(a):
                    raise ValueError("nan")
                t_sec = parse_time_to_seconds(t)
                if first_time_sec is None:
                    first_time_sec = t_sec
                t_rel_sec = t_sec - first_time_sec
            except Exception:
                bad_rows += 1
                continue

            key = (f"{t_rel_sec:.3f}", s, a)
            if key in seen_rows:
                skipped_dupes += 1
                continue
            seen_rows.add(key)

            writer.writerow([f"{t_rel_sec:.3f}", t, f"{s:.6f}", f"{a:.6f}"])
            kept_rows += 1

    return {
        "total_rows": total_rows,
        "kept_rows": kept_rows,
        "bad_rows": bad_rows,
        "skipped_dupes": skipped_dupes,
    }


def main():
    ap = argparse.ArgumentParser(
        description="Normalize GPS CSV to time/speed/accel and dedupe rows"
    )
    ap.add_argument("input", help="Input CSV path")
    ap.add_argument(
        "-o",
        "--output",
        help="Output CSV path (default: <input>_downsampled.csv)",
    )
    args = ap.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        raise SystemExit(f"Input not found: {input_path}")

    output_path = (
        Path(args.output)
        if args.output
        else input_path.with_name(f"{input_path.stem}_downsampled.csv")
    )

    stats = downsample_csv(input_path, output_path)
    print("Wrote:", output_path)
    print(
        "Rows:",
        f"total={stats['total_rows']}",
        f"kept={stats['kept_rows']}",
        f"bad={stats['bad_rows']}",
        f"skipped_dupes={stats['skipped_dupes']}",
    )


if __name__ == "__main__":
    main()

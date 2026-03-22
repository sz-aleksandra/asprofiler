import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4
import json
from typing import Iterable

from fastapi import HTTPException, UploadFile

from app.config import ANALYSIS_DIR, ANALYSIS_RETENTION_HOURS, DATA_DIR
from app.models import FileInfo


def safe_name(name: str) -> str:
    base = os.path.basename(name)
    if base != name or ".." in name or "/" in name or "\\" in name:
        raise HTTPException(status_code=400, detail="Invalid file name")
    return base


def list_files() -> list[FileInfo]:
    items = []
    for p in DATA_DIR.iterdir():
        if p.is_file():
            items.append(FileInfo(name=p.name, size=p.stat().st_size))
    return sorted(items, key=lambda x: x.name.lower())


def save_uploads(files: Iterable[UploadFile]) -> list[str]:
    saved = []
    for f in files:
        name = safe_name(f.filename or "")
        target = DATA_DIR / name
        content = f.file.read()
        target.write_bytes(content)
        saved.append(name)
    return saved


def delete_file(name: str) -> None:
    name = safe_name(name)
    target = DATA_DIR / name
    if not target.exists():
        raise HTTPException(status_code=404, detail="Not found")
    target.unlink()


def delete_files(names: Iterable[str]) -> list[str]:
    removed = []
    for name in names:
        name = safe_name(name)
        target = DATA_DIR / name
        if target.exists():
            target.unlink()
            removed.append(name)
    return removed


def safe_analysis_id(analysis_id: str) -> str:
    if not analysis_id or any(ch not in "0123456789abcdef-" for ch in analysis_id.lower()):
        raise HTTPException(status_code=400, detail="Invalid analysis id")
    return analysis_id

def _analysis_summary(payload: dict, path) -> dict:
    results = payload.get("results", [])
    names = [item.get("name") for item in results if item.get("name")]
    return {
        "analysis_id": payload.get("analysis_id"),
        "created_at": payload.get("created_at"),
        "result_count": len(results),
        "names": names,
    }


def cleanup_expired_analyses() -> list[str]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=ANALYSIS_RETENTION_HOURS)
    removed = []
    for path in ANALYSIS_DIR.glob("*.json"):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            created_raw = payload.get("created_at")
            created_at = datetime.fromisoformat(created_raw) if created_raw else None
            if created_at is None:
                created_at = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            if created_at < cutoff:
                path.unlink(missing_ok=True)
                removed.append(path.stem)
        except Exception:
            continue
    return removed


def save_analysis(
    results: list[dict],
    color_map: dict[str, str] | None = None,
) -> str:
    analysis_id = str(uuid4())
    target = ANALYSIS_DIR / f"{analysis_id}.json"
    payload = {
        "analysis_id": analysis_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "results": results,
        "color_map": color_map or {},
    }
    target.write_text(json.dumps(payload), encoding="utf-8")
    return analysis_id


def get_analysis(analysis_id: str) -> dict:
    analysis_id = safe_analysis_id(analysis_id)
    target = ANALYSIS_DIR / f"{analysis_id}.json"
    if not target.exists():
        raise HTTPException(status_code=404, detail="Analysis not found")
    return json.loads(target.read_text(encoding="utf-8"))


def list_analyses() -> list[dict]:
    cleanup_expired_analyses()
    items = []
    for path in ANALYSIS_DIR.glob("*.json"):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            items.append(_analysis_summary(payload, path))
        except Exception:
            continue
    return sorted(items, key=lambda item: item.get("created_at") or "", reverse=True)


def delete_analysis(analysis_id: str) -> None:
    analysis_id = safe_analysis_id(analysis_id)
    target = ANALYSIS_DIR / f"{analysis_id}.json"
    if not target.exists():
        raise HTTPException(status_code=404, detail="Analysis not found")
    target.unlink()

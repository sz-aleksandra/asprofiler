import os
from typing import Iterable

from fastapi import HTTPException, UploadFile

from app.config import DATA_DIR
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

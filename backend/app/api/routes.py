import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import DATA_DIR
from app.models import AnalyzeParams, AnalyzeRequest, DeleteRequest, FileInfo
from app.services.analysis import build_as_profile, load_series
from app.services.storage import delete_file as delete_one
from app.services.storage import delete_files as delete_many
from app.services.storage import list_files, safe_name

router = APIRouter()
logger = logging.getLogger("asp")


@router.get("/health")
def health():
    return {"ok": True}


@router.get("/files", response_model=list[FileInfo])
def files_list():
    return list_files()


@router.post("/files")
async def upload_files(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files")

    saved = []
    for f in files:
        name = safe_name(f.filename or "")
        target = DATA_DIR / name
        content = await f.read()
        target.write_bytes(content)
        saved.append(name)

    return {"ok": True, "saved": saved}


@router.delete("/files/{name}")
def delete_file(name: str):
    delete_one(name)
    return {"ok": True}


@router.post("/files/delete")
def delete_files(req: DeleteRequest):
    removed = delete_many(req.names)
    return {"ok": True, "removed": removed}


@router.post("/analyze")
def analyze(req: AnalyzeRequest):
    if not req.names:
        raise HTTPException(status_code=400, detail="No files selected")
    params = req.params or AnalyzeParams()

    results = []
    for name in req.names:
        safe = safe_name(name)
        path = DATA_DIR / safe
        if not path.exists():
            results.append({"name": safe, "error": "not_found"})
            continue
        times, speeds, accels, hearts, total_rows = load_series(path)
        try:
            logger.info(
                "analyze %s rows=%d",
                safe,
                total_rows,
            )
            profile = build_as_profile(times, speeds, accels, hearts, params, total_rows)
            results.append({"name": safe, "profile": profile})
        except HTTPException as e:
            results.append({"name": safe, "error": str(e.detail)})

    return {"ok": True, "results": results}

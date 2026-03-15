import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import DATA_DIR
from app.models import (
    AnalyzeParams,
    AnalyzeRequest,
    DeleteRequest,
    FileInfo,
)
from app.services.analysis import build_as_profile, load_series
from app.services.storage import delete_analysis
from app.services.storage import delete_files
from app.services.storage import get_analysis, list_analyses, list_files, safe_name, save_analysis

router = APIRouter()
logger = logging.getLogger("asp")


@router.get("/health")
def health():
    return {"ok": True}


@router.get("/files", response_model=list[FileInfo])
def files_list():
    return list_files()


@router.post("/files")
async def files_upload(files: list[UploadFile] = File(...)):
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


@router.delete("/files")
def files_delete(req: DeleteRequest):
    removed = delete_files(req.names)
    return {"ok": True, "removed": removed}


@router.post("/analyze")
def analyze(req: AnalyzeRequest):
    if not req.items:
        raise HTTPException(status_code=400, detail="No files selected")

    results = []
    for item in req.items:
        safe = safe_name(item.name)
        path = DATA_DIR / safe
        params = item.params or AnalyzeParams()
        if not path.exists():
            results.append({"name": safe, "error": "not_found"})
            continue
        times, speeds, accels, hearts, total_rows = load_series(path)
        try:
            logger.info("analyze %s rows=%d", safe, total_rows)
            profile = build_as_profile(times, speeds, accels, hearts, params, total_rows)
            results.append({"name": safe, "profile": profile})
        except HTTPException as e:
            results.append({"name": safe, "error": str(e.detail)})

    analysis_id = save_analysis(results)
    return {"ok": True, "analysis_id": analysis_id, "results": results}


@router.get("/analyses")
def analyses_list():
    return {"ok": True, "results": list_analyses()}


@router.get("/analyses/{analysis_id}")
def analysis_get(analysis_id: str):
    payload = get_analysis(analysis_id)
    return {"ok": True, **payload}


@router.delete("/analyses/{analysis_id}")
def analyses_delete(analysis_id: str):
    delete_analysis(analysis_id)
    return {"ok": True}

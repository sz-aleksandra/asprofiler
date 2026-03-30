import logging
import json
from io import StringIO

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models import AnalyzeParams, AnalyzeResultsResponse
from app.services.analysis import build_as_profile, load_series, load_series_stream

router = APIRouter()
logger = logging.getLogger("asp")


@router.get("/health")
def health():
    return {"ok": True}


@router.post("/analyze-files", response_model=AnalyzeResultsResponse)
async def analyze_files(
    files: list[UploadFile] = File(...),
    params_json: str = File("{}"),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files selected")

    try:
        raw_params = json.loads(params_json or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid params_json") from exc

    default_params = AnalyzeParams(**(raw_params.get("default") or {}))
    per_file_params = raw_params.get("per_file") or {}

    results = []
    for uploaded in files:
        name = uploaded.filename or "unnamed.csv"
        params = AnalyzeParams(**(per_file_params.get(name) or default_params.model_dump()))
        try:
            content = await uploaded.read()
            text = content.decode("utf-8-sig")
            times, speeds, accels, absolute_times, total_rows = load_series_stream(StringIO(text))
            logger.info("analyze transient %s rows=%d", name, total_rows)
            profile = build_as_profile(times, speeds, accels, absolute_times, params, total_rows)
            results.append({"name": name, "profile": profile})
        except HTTPException as exc:
            results.append({"name": name, "error": str(exc.detail)})
        except UnicodeDecodeError:
            results.append({"name": name, "error": "Could not decode CSV as utf-8"})

    return {"ok": True, "results": results}

import json
from io import StringIO

import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.services.auth.deps import require_auth
from app.services.analysis.schemas import AnalysisParams, AnalysisResults, PreprocessingParams
from app.services.analysis.orchestrator import build_analysis
from app.services.analysis.modules.preprocessing import (
    PreprocessingError,
    load_gps_series_stream,
    preprocess_series,
)
from app.utils.pitch import (
    PitchProjectionError,
    compute_pitch_projection_context,
    find_fast_points,
)

router = APIRouter(prefix="/analysis")


class _Params(BaseModel):
    per_file_params: dict[str, AnalysisParams]
    preprocessing_params: PreprocessingParams


def _parse_params(raw_params: str) -> _Params:
    return _Params.model_validate(json.loads(raw_params))


@router.post("/analyze", response_model=AnalysisResults)
async def analyze_files(
    files: list[UploadFile] = File(...),
    params: str = Form(...),
    _authenticated=Depends(require_auth),
):
    parsed_params = _parse_params(params)

    file_entries: list[dict] = []
    for uploaded_file in files:
        file_name = uploaded_file.filename
        if file_name not in parsed_params.per_file_params:
            raise HTTPException(
                status_code=422,
                detail=f"Missing analysis params for file: {file_name}",
            )
        file_params = parsed_params.per_file_params[file_name]
        try:
            content = await uploaded_file.read()
            absolute_times, speeds, lats, lons = load_gps_series_stream(
                StringIO(content.decode("utf-8-sig"))
            )
            series = preprocess_series(
                absolute_times,
                speeds,
                lats,
                lons,
                parsed_params.preprocessing_params,
            )
            file_entries.append({"file_name": file_name, "params": file_params, "series": series})
        except PreprocessingError as error:
            file_entries.append({"file_name": file_name, "error": str(error)})

    valid_entries = [entry for entry in file_entries if "error" not in entry]
    if valid_entries:
        fast_points = [
            find_fast_points(
                entry["series"].lats,
                entry["series"].lons,
                entry["series"].speeds,
                min_speed=3.0,
            )
            for entry in valid_entries
        ]
        try:
            pitch_context = compute_pitch_projection_context(
                np.concatenate([point[0] for point in fast_points]),
                np.concatenate([point[1] for point in fast_points]),
            )
        except PitchProjectionError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    results = []
    for entry in file_entries:
        if "error" in entry:
            results.append({"file_name": entry["file_name"], "error": entry["error"]})
            continue
        analysis = build_analysis(entry["series"], entry["params"], pitch_context)
        results.append({"file_name": entry["file_name"], "analysis": analysis})

    return {"results": results}

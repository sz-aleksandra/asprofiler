import json
from dataclasses import dataclass
from io import StringIO

import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import require_authorized_user
from app.schemas.analysis import AnalyzeParameters, AnalyzeResultsResponse, PreprocessingParameters
from app.services.analysis import build_as_profile, resolve_file_parameters
from app.services.preprocessing import load_series_stream, preprocess_series

router = APIRouter()


@dataclass
class _AnalysisRequest:
    default_parameters: AnalyzeParameters
    per_file_parameters: dict[str, dict]
    preprocessing_parameters: PreprocessingParameters


def _parse_parameters_json(parameters_json: str) -> _AnalysisRequest:
    try:
        raw = json.loads(parameters_json or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid parameters_json") from exc

    return _AnalysisRequest(
        default_parameters=AnalyzeParameters(**(raw.get("default") or {})),
        per_file_parameters=raw.get("per_file") or {},
        preprocessing_parameters=PreprocessingParameters(
            **(raw.get("preprocessing_parameters") or {})
        ),
    )


@router.post("/analyze-files", response_model=AnalyzeResultsResponse)
async def analyze_files(
    files: list[UploadFile] = File(...),
    parameters_json: str = File("{}"),
    _auth=Depends(require_authorized_user),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files selected")

    analysis_request = _parse_parameters_json(parameters_json)

    results = []
    for uploaded in files:
        name = uploaded.filename or "unnamed.csv"
        parameters = resolve_file_parameters(
            name,
            analysis_request.default_parameters,
            analysis_request.per_file_parameters,
        )
        try:
            content = await uploaded.read()
            text = content.decode("utf-8-sig")
            absolute_times, raw_speeds, raw_latitudes, raw_longitudes = load_series_stream(StringIO(text))
            series = preprocess_series(
                absolute_times,
                raw_speeds,
                raw_latitudes,
                raw_longitudes,
                analysis_request.preprocessing_parameters,
            )
            profile = build_as_profile(
                np.array(series.relative_times),
                np.array(series.speeds),
                np.array(series.accelerations),
                series.absolute_times,
                series.latitudes,
                series.longitudes,
                parameters,
            )
            results.append({"name": name, "profile": profile})
        except HTTPException as exc:
            results.append({"name": name, "error": str(exc.detail)})
        except UnicodeDecodeError:
            results.append({"name": name, "error": "Could not decode CSV as utf-8"})

    return {"ok": True, "results": results}

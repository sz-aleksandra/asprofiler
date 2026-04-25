import json
from io import StringIO

from pydantic import BaseModel
from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile, status

from app.auth import (
    is_auth_configured,
    is_cookie_valid,
    require_authenticated_user,
    set_auth_cookie,
    verify_password,
)
from app.models import AnalyzeParams, AnalyzeResultsResponse
from app.services.analysis import build_as_profile, load_series_stream

router = APIRouter()


class LoginPayload(BaseModel):
    password: str = ""


@router.get("/health")
def health():
    return {"ok": True}


@router.get("/auth/session")
def auth_session(request: Request):
    auth_cookie = request.cookies.get("asprofiler_session")
    configured = is_auth_configured()
    authenticated = configured and is_cookie_valid(auth_cookie)
    return {"ok": True, "configured": configured, "authenticated": authenticated}


@router.post("/auth/login")
def auth_login(payload: LoginPayload, request: Request, response: Response):
    if not is_auth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        )

    if not verify_password(payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
        )

    set_auth_cookie(response, request)
    return {"ok": True}


@router.post("/analyze-files", response_model=AnalyzeResultsResponse)
async def analyze_files(
    files: list[UploadFile] = File(...),
    params_json: str = File("{}"),
    _auth=Depends(require_authenticated_user),
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
            times, speeds, accels, absolute_times, latitudes, longitudes = load_series_stream(StringIO(text))
            profile = build_as_profile(
                times,
                speeds,
                accels,
                absolute_times,
                latitudes,
                longitudes,
                params,
            )
            results.append({"name": name, "profile": profile})
        except HTTPException as exc:
            results.append({"name": name, "error": str(exc.detail)})
        except UnicodeDecodeError:
            results.append({"name": name, "error": "Could not decode CSV as utf-8"})

    return {"ok": True, "results": results}

from fastapi import APIRouter, HTTPException, Request, Response, status

from app.services.auth.core import (
    SESSION_COOKIE_NAME,
    is_auth_configured,
    is_session_cookie_valid,
    set_session_cookie,
    verify_password,
)
from app.services.auth.schemas import LoginRequest, SessionResponse

router = APIRouter(prefix="/auth")


@router.get("/session", response_model=SessionResponse)
def session(request: Request):
    session_cookie = request.cookies.get(SESSION_COOKIE_NAME)
    return {"authenticated": is_session_cookie_valid(session_cookie)}


@router.post("/login")
def login(login_request: LoginRequest, request: Request, response: Response):
    if not is_auth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        )

    if not verify_password(login_request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
        )

    set_session_cookie(response, request)
    return {}

from fastapi import APIRouter, HTTPException, Request, Response, status

from app.core.authorization import (
    SESSION_COOKIE_NAME,
    is_authorization_configured,
    is_session_cookie_valid,
    set_session_cookie,
    verify_password,
)
from app.schemas.authorization import LoginPayload, LoginResponse, SessionResponse

router = APIRouter(prefix="/authorization")


@router.get("/session", response_model=SessionResponse)
def session(request: Request):
    session_cookie = request.cookies.get(SESSION_COOKIE_NAME)
    configured = is_authorization_configured()
    authenticated = configured and is_session_cookie_valid(session_cookie)
    return {"ok": True, "configured": configured, "authenticated": authenticated}


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginPayload, request: Request, response: Response):
    if not is_authorization_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authorization is not configured",
        )

    if not verify_password(payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
        )

    set_session_cookie(response, request)
    return {"ok": True}

from fastapi import Cookie, HTTPException, status

from app.services.auth.core import (
    SESSION_COOKIE_NAME,
    is_auth_configured,
    is_session_cookie_valid,
)


def require_auth(
    session_cookie: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
):
    if not is_auth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        )

    if not is_session_cookie_valid(session_cookie):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

from fastapi import Cookie, HTTPException, status

from app.core.authorization import (
    SESSION_COOKIE_NAME,
    is_authorization_configured,
    is_session_cookie_valid,
)


def require_authorized_user(
    session_cookie: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
):
    if not is_authorization_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authorization is not configured",
        )

    if not is_session_cookie_valid(session_cookie):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization required",
        )

import base64
import hashlib
import hmac
import os
import secrets
import time
from dataclasses import dataclass

from fastapi import Cookie, HTTPException, Request, Response, status

AUTH_COOKIE_NAME = "asprofiler_session"
DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
LOCAL_HOSTS = {"localhost", "127.0.0.1"}


@dataclass
class AuthSettings:
    password: str
    session_secret: str
    session_ttl_seconds: int
    cookie_secure: bool | None
    cookie_samesite: str | None


def get_auth_settings() -> AuthSettings:
    password = os.getenv("APP_PASSWORD", "").strip()
    session_secret = os.getenv("APP_SESSION_SECRET", "").strip() or password
    ttl_raw = os.getenv("APP_SESSION_TTL_SECONDS", str(DEFAULT_SESSION_TTL_SECONDS))
    raw_cookie_secure = os.getenv("APP_COOKIE_SECURE")
    cookie_secure = None if raw_cookie_secure is None else raw_cookie_secure == "True"
    cookie_samesite = os.getenv("APP_COOKIE_SAMESITE")

    try:
        session_ttl_seconds = max(1, int(ttl_raw))
    except ValueError:
        session_ttl_seconds = DEFAULT_SESSION_TTL_SECONDS

    return AuthSettings(
        password=password,
        session_secret=session_secret,
        session_ttl_seconds=session_ttl_seconds,
        cookie_secure=cookie_secure,
        cookie_samesite=cookie_samesite.strip().lower() if cookie_samesite else None,
    )


def is_auth_configured() -> bool:
    settings = get_auth_settings()
    return bool(settings.password and settings.session_secret)


def verify_password(candidate: str) -> bool:
    settings = get_auth_settings()
    if not settings.password:
        return False

    return secrets.compare_digest(candidate, settings.password)


def _cookie_policy(request: Request) -> tuple[bool, str]:
    settings = get_auth_settings()
    host = (request.url.hostname or "").lower()
    secure = settings.cookie_secure
    same_site = settings.cookie_samesite

    if secure is None:
        secure = host not in LOCAL_HOSTS
    if same_site is None:
        same_site = "none" if secure else "lax"

    return secure, same_site


def _sign_payload(payload: str, secret: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


def build_session_cookie_value() -> str:
    settings = get_auth_settings()
    issued_at = str(int(time.time()))
    signature = _sign_payload(issued_at, settings.session_secret)
    return f"{issued_at}|{signature}"


def _decode_cookie(cookie_value: str) -> tuple[int, str]:
    issued_at, signature = cookie_value.split("|", 1)
    return int(issued_at), signature


def is_cookie_valid(cookie_value: str | None) -> bool:
    if not cookie_value:
        return False

    settings = get_auth_settings()
    if not settings.password or not settings.session_secret:
        return False

    try:
        issued_at, provided_signature = _decode_cookie(cookie_value)
    except (TypeError, ValueError):
        return False

    expected_signature = _sign_payload(str(issued_at), settings.session_secret)
    if not secrets.compare_digest(provided_signature, expected_signature):
        return False

    return int(time.time()) - issued_at <= settings.session_ttl_seconds


def set_auth_cookie(response: Response, request: Request) -> None:
    settings = get_auth_settings()
    secure, same_site = _cookie_policy(request)
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=build_session_cookie_value(),
        httponly=True,
        secure=secure,
        samesite=same_site,
        max_age=settings.session_ttl_seconds,
        path="/",
    )


def require_authenticated_user(
    auth_cookie: str | None = Cookie(default=None, alias=AUTH_COOKIE_NAME),
):
    if not is_auth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        )

    if not is_cookie_valid(auth_cookie):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

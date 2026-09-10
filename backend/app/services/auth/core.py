from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import time
from dataclasses import dataclass

from fastapi import Request, Response

SESSION_COOKIE_NAME = "asprofiler_session"
_DEFAULT_SESSION_TTL = 60 * 60 * 24 * 7
_LOCAL_HOSTS = {"localhost", "127.0.0.1"}


@dataclass
class _AuthSettings:
    password: str
    session_secret: str
    session_ttl: int
    cookie_secure: bool | None
    cookie_same_site: str | None


def _get_auth_settings() -> _AuthSettings:
    password = os.getenv("APP_PASSWORD", "").strip()
    session_secret = os.getenv("APP_SESSION_SECRET", "").strip()
    env_session_ttl = os.getenv("APP_SESSION_TTL_SECONDS")
    env_cookie_secure = os.getenv("APP_COOKIE_SECURE")
    cookie_secure = None if env_cookie_secure is None else env_cookie_secure == "True"
    cookie_same_site = os.getenv("APP_COOKIE_SAMESITE")

    session_ttl = int(env_session_ttl) if env_session_ttl else _DEFAULT_SESSION_TTL

    return _AuthSettings(
        password=password,
        session_secret=session_secret,
        session_ttl=session_ttl,
        cookie_secure=cookie_secure,
        cookie_same_site=cookie_same_site.strip().lower() if cookie_same_site else None,
    )


def is_auth_configured() -> bool:
    settings = _get_auth_settings()
    return bool(settings.password and settings.session_secret)


def verify_password(password: str) -> bool:
    settings = _get_auth_settings()
    return secrets.compare_digest(password, settings.password)


def _sign_session(timestamp: str, secret: str) -> str:
    signature_bytes = hmac.new(
        secret.encode("utf-8"), timestamp.encode("utf-8"), hashlib.sha256
    ).digest()
    return base64.urlsafe_b64encode(signature_bytes).decode("ascii").rstrip("=")


def is_session_cookie_valid(session_cookie: str | None) -> bool:
    settings = _get_auth_settings()
    if not session_cookie:
        return False
    if not (settings.password and settings.session_secret):
        return False

    try:
        timestamp, cookie_signature = session_cookie.split("|", 1)
        issued_at = int(timestamp)
    except ValueError:
        return False

    expected_signature = _sign_session(str(issued_at), settings.session_secret)
    if not secrets.compare_digest(cookie_signature, expected_signature):
        return False

    return int(time.time()) - issued_at <= settings.session_ttl


def set_session_cookie(response: Response, request: Request) -> None:
    settings = _get_auth_settings()
    hostname = (request.url.hostname or "").lower()
    cookie_secure = settings.cookie_secure
    if cookie_secure is None:
        cookie_secure = hostname not in _LOCAL_HOSTS
    cookie_same_site = settings.cookie_same_site
    if cookie_same_site is None:
        cookie_same_site = "none" if cookie_secure else "lax"
    issued_at = str(int(time.time()))
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=f"{issued_at}|{_sign_session(issued_at, settings.session_secret)}",
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_same_site,
        max_age=settings.session_ttl,
        path="/",
    )

from __future__ import annotations

import time

import pytest
from fastapi import HTTPException, Response

from app.services.auth.core import (
    SESSION_COOKIE_NAME,
    _get_auth_settings,
    _sign_session,
    is_auth_configured,
    is_session_cookie_valid,
    set_session_cookie,
    verify_password,
)
from app.services.auth.deps import require_auth


@pytest.fixture
def configured_auth(monkeypatch):
    monkeypatch.setenv("APP_PASSWORD", "pw")
    monkeypatch.setenv("APP_SESSION_SECRET", "secret")
    monkeypatch.delenv("APP_SESSION_TTL_SECONDS", raising=False)
    monkeypatch.delenv("APP_COOKIE_SECURE", raising=False)
    monkeypatch.delenv("APP_COOKIE_SAMESITE", raising=False)


@pytest.fixture
def unconfigured_auth(monkeypatch):
    monkeypatch.delenv("APP_PASSWORD", raising=False)
    monkeypatch.delenv("APP_SESSION_SECRET", raising=False)


class _FakeRequest:
    def __init__(self, hostname: str):
        self.url = type("_FakeUrl", (), {"hostname": hostname})()


def _build_cookie_header(hostname: str) -> str:
    response = Response()
    set_session_cookie(response, _FakeRequest(hostname))
    return response.headers.get("set-cookie", "").lower()


def _build_fresh_session_cookie(secret: str) -> str:
    issued_at = str(int(time.time()))
    return f"{issued_at}|{_sign_session(issued_at, secret)}"


class TestGetAuthSettings:
    def test_returns_default_settings(self, configured_auth):
        settings = _get_auth_settings()
        assert settings.password == "pw"
        assert settings.session_secret == "secret"
        assert settings.session_ttl == 60 * 60 * 24 * 7
        assert settings.cookie_secure is None
        assert settings.cookie_same_site is None

    def test_env_variables_override_defaults(self, monkeypatch):
        monkeypatch.setenv("APP_PASSWORD", "pw")
        monkeypatch.setenv("APP_SESSION_SECRET", "s")
        monkeypatch.setenv("APP_SESSION_TTL_SECONDS", "3600")
        monkeypatch.setenv("APP_COOKIE_SECURE", "True")
        monkeypatch.setenv("APP_COOKIE_SAMESITE", "Strict")
        settings = _get_auth_settings()
        assert settings.session_ttl == 3600
        assert settings.cookie_secure is True
        assert settings.cookie_same_site == "strict"


class TestIsAuthConfigured:
    def test_true_when_password_and_secret_set(self, configured_auth):
        assert is_auth_configured() is True

    def test_false_when_password_or_secret_missing(self, unconfigured_auth):
        assert is_auth_configured() is False


class TestVerifyPassword:
    def test_accepts_correct_password(self, configured_auth):
        assert verify_password("pw") is True

    def test_rejects_wrong_password(self, configured_auth):
        assert verify_password("wrong") is False


class TestSignSession:
    def test_signature_is_deterministic(self):
        assert _sign_session("123", "secret") == _sign_session("123", "secret")

    def test_secret_changes_signature(self):
        assert _sign_session("123", "a") != _sign_session("123", "b")


class TestIsSessionCookieValid:
    def test_valid_when_cookie_is_fresh(self, configured_auth):
        assert is_session_cookie_valid(_build_fresh_session_cookie("secret")) is True

    def test_invalid_when_cookie_is_none(self, configured_auth):
        assert is_session_cookie_valid(None) is False

    def test_invalid_when_cookie_malformed(self, configured_auth):
        assert is_session_cookie_valid("no_pipe_here") is False

    def test_invalid_when_timestamp_not_integer(self, configured_auth):
        assert is_session_cookie_valid("abc|sig") is False

    def test_invalid_when_signature_wrong(self, configured_auth):
        assert is_session_cookie_valid("1000|wrongsig") is False

    def test_invalid_when_cookie_expired(self, configured_auth):
        stale_timestamp = int(time.time()) - _get_auth_settings().session_ttl - 10
        assert is_session_cookie_valid(
            f"{stale_timestamp}|{_sign_session(str(stale_timestamp), 'secret')}"
        ) is False

    def test_invalid_when_auth_not_configured(self, unconfigured_auth):
        assert is_session_cookie_valid("something|sig") is False


class TestSetSessionCookie:
    def test_sets_baseline_cookie_attributes(self, configured_auth):
        header = _build_cookie_header("localhost")
        assert SESSION_COOKIE_NAME.lower() in header
        assert "httponly" in header
        assert f"max-age={_get_auth_settings().session_ttl}" in header
        assert "path=/" in header

    def test_localhost_defaults_to_insecure_lax(self, configured_auth):
        header = _build_cookie_header("localhost")
        assert "secure" not in header
        assert "samesite=lax" in header

    def test_remote_host_defaults_to_secure_none(self, configured_auth):
        header = _build_cookie_header("example.com")
        assert "secure" in header
        assert "samesite=none" in header

    def test_env_overrides_apply(self, monkeypatch):
        monkeypatch.setenv("APP_PASSWORD", "pw")
        monkeypatch.setenv("APP_SESSION_SECRET", "secret")
        monkeypatch.setenv("APP_COOKIE_SECURE", "True")
        monkeypatch.setenv("APP_COOKIE_SAMESITE", "Strict")
        header = _build_cookie_header("localhost")
        assert "secure" in header
        assert "samesite=strict" in header


class TestRequireAuth:
    def test_raises_503_when_auth_not_configured(self, unconfigured_auth):
        with pytest.raises(HTTPException) as exception_info:
            require_auth(session_cookie=None)
        assert exception_info.value.status_code == 503

    def test_raises_401_when_cookie_missing(self, configured_auth):
        with pytest.raises(HTTPException) as exception_info:
            require_auth(session_cookie=None)
        assert exception_info.value.status_code == 401

    def test_raises_401_when_cookie_invalid(self, configured_auth):
        with pytest.raises(HTTPException) as exception_info:
            require_auth(session_cookie="garbage")
        assert exception_info.value.status_code == 401

    def test_passes_when_cookie_valid(self, configured_auth):
        require_auth(session_cookie=_build_fresh_session_cookie("secret"))

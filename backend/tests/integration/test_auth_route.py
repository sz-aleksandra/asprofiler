from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.services.auth.core import SESSION_COOKIE_NAME


@pytest.fixture
def client_configured(monkeypatch):
    monkeypatch.setenv("APP_PASSWORD", "pw")
    monkeypatch.setenv("APP_SESSION_SECRET", "secret")
    monkeypatch.setenv("APP_COOKIE_SECURE", "False")
    from app.main import app
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def client_no_auth(monkeypatch):
    monkeypatch.delenv("APP_PASSWORD", raising=False)
    monkeypatch.delenv("APP_SESSION_SECRET", raising=False)
    from app.main import app
    with TestClient(app) as test_client:
        yield test_client


class TestAuthRoutes:
    def test_session_reports_unauthenticated_when_auth_not_configured(self, client_no_auth):
        response = client_no_auth.get("/auth/session")
        assert response.status_code == 200
        assert response.json() == {"authenticated": False}

    def test_login_returns_503_when_auth_not_configured(self, client_no_auth):
        response = client_no_auth.post("/auth/login", json={"password": "x"})
        assert response.status_code == 503

    def test_login_returns_401_on_wrong_password(self, client_configured):
        response = client_configured.post("/auth/login", json={"password": "wrong"})
        assert response.status_code == 401

    def test_login_sets_cookie_and_authenticates_session(self, client_configured):
        login_response = client_configured.post("/auth/login", json={"password": "pw"})
        assert login_response.status_code == 200
        assert SESSION_COOKIE_NAME in login_response.cookies
        assert client_configured.get("/auth/session").json() == {"authenticated": True}

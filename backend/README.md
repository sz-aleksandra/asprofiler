# Backend (FastAPI)

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run (dev)

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Auth setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `APP_PASSWORD` and `APP_SESSION_SECRET`.
3. Adjust `APP_CORS_ORIGINS` if your frontend runs from another origin.

The backend uses a signed `HttpOnly` cookie. On localhost it defaults to a non-secure `SameSite=Lax` cookie, and for non-local hosts it defaults to `Secure` with `SameSite=None`.

## Endpoints

- `GET /health`
- `GET /auth/session`
- `POST /auth/login`
- `POST /analyze-files`

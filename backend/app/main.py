import logging
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def load_local_env() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not key or key in os.environ:
            continue
        os.environ[key] = value.strip().strip('"').strip("'")


load_local_env()

from app.api.routes import router

app = FastAPI(title="GPS ASP Analyzer")
logger = logging.getLogger("asp")
if not logger.handlers:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "APP_CORS_ORIGINS",
        ",".join(
            [
                "http://asprofiler-frontend.s3-website.eu-central-1.amazonaws.com",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]
        ),
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

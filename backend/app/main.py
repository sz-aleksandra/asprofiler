import os

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analysis, auth

router = APIRouter()
router.include_router(auth.router)
router.include_router(analysis.router)

app = FastAPI(title="ASProfiler")

allowed_origins = [
    stripped
    for origin in os.getenv(
        "APP_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if (stripped := origin.strip())
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

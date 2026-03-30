import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router

app = FastAPI(title="GPS ASP Analyzer")
logger = logging.getLogger("asp")
if not logger.handlers:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://asprofiler-frontend.s3-website.eu-central-1.amazonaws.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

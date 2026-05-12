from fastapi import APIRouter

from app.api.routes import analysis, authorization, health

router = APIRouter()
router.include_router(health.router)
router.include_router(authorization.router)
router.include_router(analysis.router)

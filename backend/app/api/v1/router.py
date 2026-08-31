from fastapi import APIRouter

from app.api.v1.endpoints import documents, health, statutory

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(statutory.router, prefix="/statutory", tags=["Statutory Compliance"])

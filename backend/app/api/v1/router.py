from fastapi import APIRouter

from app.api.v1.endpoints import (
    compliance,
    documents,
    gst,
    health,
    oem,
    pan,
    review,
    scoring,
    statutory,
    udyam,
)

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(statutory.router, prefix="/statutory", tags=["Statutory Compliance"])
api_router.include_router(gst.router, prefix="/gst", tags=["GST Compliance"])
api_router.include_router(pan.router, prefix="/pan", tags=["PAN Compliance"])
api_router.include_router(udyam.router, prefix="/udyam", tags=["Udyam MSME Compliance"])
api_router.include_router(oem.router, prefix="/oem", tags=["OEM Authorization Compliance"])
api_router.include_router(scoring.router, prefix="/scoring", tags=["Scoring Methodology & Policy"])
api_router.include_router(review.router, prefix="/review", tags=["Officer Decision Support"])
api_router.include_router(compliance.router, prefix="/compliance", tags=["Compliance Intelligence"])




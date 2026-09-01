import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from app.schemas.composite import (
    CompositeVerificationResponse,
    ExtractedEntitiesSummary,
    ScoringEvaluationRequest,
    ScoringPolicy,
    StatutoryVerificationsBundle,
)
from app.services.compliance.scoring_engine import compliance_scoring_engine

router = APIRouter()


@router.get(
    "/policy",
    response_model=ScoringPolicy,
    summary="Get active compliance review-priority scoring policy",
    description=(
        "Retrieves the active platform-defined scoring policy including starting baseline, "
        "deduction weights, risk thresholds, and policy justifications."
    ),
)
async def get_scoring_policy() -> ScoringPolicy:
    """Return default scoring policy parameters."""
    return compliance_scoring_engine.policy


@router.post(
    "/evaluate",
    summary="Evaluate standalone scoring and itemized waterfall deductions",
    description=(
        "Computes review priority score, risk tier, itemized deductions, and actionable findings "
        "given statutory verifications and consistency check outcomes."
    ),
)
async def evaluate_scoring(request: ScoringEvaluationRequest):
    """Evaluate score and explainable deductions."""
    try:
        gstin_resp = request.statutory_verifications.gstin if request.statutory_verifications else None
        pan_resp = request.statutory_verifications.pan if request.statutory_verifications else None
        udyam_resp = request.statutory_verifications.udyam if request.statutory_verifications else None
        oem_resp = request.statutory_verifications.oem if request.statutory_verifications else None

        (
            score,
            risk_level,
            risk_guidance,
            composite_status,
            breakdown,
            findings,
        ) = compliance_scoring_engine.calculate_score(
            gstin_resp=gstin_resp,
            pan_resp=pan_resp,
            udyam_resp=udyam_resp,
            oem_resp=oem_resp,
            consistency_results=request.consistency_checks,
            policy=request.scoring_policy,
        )

        return {
            "overall_score": score,
            "risk_level": risk_level,
            "risk_guidance": risk_guidance,
            "overall_status": composite_status,
            "score_breakdown": breakdown,
            "findings": findings,
            "is_human_decision_required": True,
            "disclaimer": (
                "This score is a platform-defined review priority score for human procurement officers. "
                "It does NOT constitute an official government compliance score or automatic tender decision."
            ),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scoring evaluation error: {str(e)}",
        )

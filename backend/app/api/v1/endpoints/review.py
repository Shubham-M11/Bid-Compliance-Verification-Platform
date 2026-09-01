import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from app.schemas.composite import (
    OfficerActionType,
    OfficerDecisionRequest,
    OfficerDecisionResponse,
)

router = APIRouter()


@router.post(
    "/decision",
    response_model=OfficerDecisionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record human procurement officer review decision",
    description=(
        "Records an immutable human officer evaluation decision, notes, and acknowledged findings "
        "for audit trail tracking. The platform does NOT make automatic award decisions."
    ),
)
async def record_officer_decision(request: OfficerDecisionRequest) -> OfficerDecisionResponse:
    """Record an explainable human review decision."""
    try:
        decision_id = f"DEC-{uuid.uuid4().hex[:8].upper()}"
        
        # Human-readable summary depending on action
        action_summaries = {
            OfficerActionType.REVIEW_IN_PROGRESS: f"Review started by {request.officer_name} ({request.officer_designation}).",
            OfficerActionType.EVIDENCE_CONFIRMED: f"All submitted document evidence verified and confirmed by {request.officer_name}.",
            OfficerActionType.CLARIFICATION_REQUESTED: f"Clarification requested from bidder by {request.officer_name} ({len(request.findings_reviewed)} finding(s) cited).",
            OfficerActionType.ESCALATED_FOR_MANUAL_REVIEW: f"Tender evaluation escalated to senior committee by {request.officer_name}.",
            OfficerActionType.RECOMMEND_ACCEPTANCE: f"Human recommendation for technical qualification recorded by {request.officer_name}.",
            OfficerActionType.RECOMMEND_REJECTION: f"Human recommendation for disqualification recorded by {request.officer_name} on statutory grounds.",
        }
        
        summary = action_summaries.get(
            request.action,
            f"Officer action '{request.action.value}' recorded by {request.officer_name}."
        )

        return OfficerDecisionResponse(
            decision_id=decision_id,
            verification_id=request.verification_id,
            officer_name=request.officer_name,
            officer_designation=request.officer_designation,
            action=request.action,
            officer_notes=request.officer_notes,
            findings_reviewed=request.findings_reviewed,
            timestamp=datetime.now(timezone.utc),
            is_human_decision=True,
            status_summary=summary,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to record officer decision: {str(e)}",
        )

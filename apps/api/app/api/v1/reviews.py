"""Review API: founder approve/edit/reject low-confidence answers."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.api.v1.notifications import broadcast_approved_answer
from app.core.supabase import get_service_client
from app.models.query import ReviewAction, ReviewItem

logger = logging.getLogger(__name__)

router = APIRouter(tags=["reviews"])

# TODO(Phase 6): Replace with authenticated user from request
DEMO_USER_ID = "00000000-0000-0000-0000-000000000000"


@router.get("/reviews")
async def list_reviews(status: str = "pending_review") -> list[ReviewItem]:
    """List queries filtered by review_status."""
    client = get_service_client()
    result = (
        client.table("queries")
        .select("*")
        .eq("review_status", status)
        .order("created_at", desc=False)
        .execute()
    )

    items: list[ReviewItem] = []
    for row in result.data:
        items.append(
            ReviewItem(
                query_id=row["id"],
                question=row["question"],
                answer=row.get("answer"),
                citations=row.get("citations", []),
                confidence_score=row.get("confidence_score"),
                confidence_tier=row.get("confidence_tier"),
                review_status=row["review_status"],
                founder_answer=row.get("founder_answer"),
                created_at=row.get("created_at"),
            )
        )
    return items


@router.put("/reviews/{query_id}")
async def update_review(query_id: str, body: ReviewAction) -> ReviewItem:
    """Approve, edit, or reject a pending review."""
    client = get_service_client()

    # Fetch query
    try:
        result = (
            client.table("queries")
            .select("*")
            .eq("id", query_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Query not found")

    row = result.data
    if row["review_status"] != "pending_review":
        raise HTTPException(
            status_code=400,
            detail=f"Query review_status is '{row['review_status']}', expected 'pending_review'",
        )

    now = datetime.now(timezone.utc).isoformat()
    update_data: dict = {
        "reviewed_by": DEMO_USER_ID,
        "reviewed_at": now,
        "status": "complete",
    }

    if body.action == "approve":
        update_data["review_status"] = "approved"
    elif body.action == "edit":
        update_data["review_status"] = "edited"
        update_data["founder_answer"] = body.edited_answer
        update_data["answer"] = body.edited_answer
    elif body.action == "reject":
        update_data["review_status"] = "rejected"
        update_data["founder_answer"] = body.edited_answer
        update_data["answer"] = body.edited_answer

    updated = (
        client.table("queries")
        .update(update_data)
        .eq("id", query_id)
        .execute()
    )
    updated_row = updated.data[0] if updated.data else {**row, **update_data}

    # Broadcast to connected investors
    answer_text = updated_row.get("founder_answer") or updated_row.get("answer", "")
    await broadcast_approved_answer(query_id, answer_text, "verified")

    return ReviewItem(
        query_id=updated_row.get("id", query_id),
        question=updated_row.get("question", row["question"]),
        answer=updated_row.get("answer"),
        citations=updated_row.get("citations", []),
        confidence_score=updated_row.get("confidence_score"),
        confidence_tier=updated_row.get("confidence_tier"),
        review_status=updated_row.get("review_status", body.action),
        founder_answer=updated_row.get("founder_answer"),
        created_at=updated_row.get("created_at"),
    )

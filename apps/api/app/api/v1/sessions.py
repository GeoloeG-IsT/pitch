"""Sessions API: live pitch session lifecycle and live question actions."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.api.v1.notifications import (
    broadcast_approved_answer,
    broadcast_dismissed_question,
    broadcast_session_event,
)
from app.core.auth import get_current_user
from app.core.supabase import get_service_client
from app.models.query import ReviewItem
from app.models.session import SessionAction, SessionResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["sessions"])

# In-memory session cache: founder_id -> {"id": session_id, "started_at": ...}
_active_sessions: dict[str, dict] = {}


def get_active_session(founder_id: str) -> dict | None:
    """Return the cached active session for a founder, or None."""
    return _active_sessions.get(founder_id)


def get_active_session_by_id(session_id: str) -> dict | None:
    """Find an active session by its ID."""
    for _fid, session_data in _active_sessions.items():
        if session_data["id"] == session_id:
            return session_data
    return None


async def load_active_sessions() -> None:
    """Load active sessions from DB into cache on startup."""
    try:
        client = get_service_client()
        result = (
            client.table("live_sessions")
            .select("*")
            .is_("ended_at", "null")
            .execute()
        )
        for row in result.data or []:
            _active_sessions[row["founder_id"]] = {
                "id": row["id"],
                "started_at": row["started_at"],
                "founder_id": row["founder_id"],
            }
        logger.info("Loaded %d active session(s) from DB", len(_active_sessions))
    except Exception:
        logger.warning("Could not load active sessions from DB (table may not exist yet)")


@router.post("/sessions", status_code=201)
async def create_session(user: dict = Depends(get_current_user)) -> SessionResponse:
    """Start a new live pitch session."""
    founder_id = user["sub"]

    if founder_id in _active_sessions:
        raise HTTPException(status_code=409, detail="Active session already exists")

    client = get_service_client()
    result = (
        client.table("live_sessions")
        .insert({"founder_id": founder_id})
        .execute()
    )
    row = result.data[0]

    _active_sessions[founder_id] = {
        "id": row["id"],
        "started_at": row["started_at"],
        "founder_id": founder_id,
    }

    await broadcast_session_event(founder_id, {"type": "session_started"})

    return SessionResponse(
        session_id=row["id"],
        founder_id=founder_id,
        started_at=row["started_at"],
        is_active=True,
    )


@router.delete("/sessions/{session_id}")
async def end_session(
    session_id: str, user: dict = Depends(get_current_user)
) -> SessionResponse:
    """End an active live pitch session."""
    founder_id = user["sub"]
    client = get_service_client()

    # Fetch session from DB
    try:
        result = (
            client.table("live_sessions")
            .select("*")
            .eq("id", session_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Session not found")

    row = result.data
    if row["founder_id"] != founder_id:
        raise HTTPException(status_code=403, detail="Not your session")
    if row.get("ended_at") is not None:
        raise HTTPException(status_code=400, detail="Session already ended")

    now = datetime.now(timezone.utc).isoformat()
    client.table("live_sessions").update({"ended_at": now}).eq("id", session_id).execute()

    _active_sessions.pop(founder_id, None)

    await broadcast_session_event(founder_id, {"type": "session_ended"})

    return SessionResponse(
        session_id=session_id,
        founder_id=founder_id,
        started_at=row["started_at"],
        ended_at=now,
        is_active=False,
    )


@router.get("/sessions/active")
async def get_active(user: dict = Depends(get_current_user)):
    """Return the active session for the current founder, or null."""
    founder_id = user["sub"]
    session_data = _active_sessions.get(founder_id)

    if session_data:
        return SessionResponse(
            session_id=session_data["id"],
            founder_id=founder_id,
            started_at=session_data["started_at"],
            is_active=True,
        )
    return {"session": None}


@router.put("/sessions/{session_id}/questions/{query_id}")
async def handle_live_question(
    session_id: str,
    query_id: str,
    body: SessionAction,
    user: dict = Depends(get_current_user),
) -> ReviewItem:
    """Handle a live question action (approve/edit/override/dismiss)."""
    founder_id = user["sub"]
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
    if row.get("live_session_id") != session_id:
        raise HTTPException(
            status_code=400, detail="Query does not belong to this session"
        )

    now = datetime.now(timezone.utc).isoformat()
    update_data: dict = {
        "reviewed_by": founder_id,
        "reviewed_at": now,
        "status": "complete",
    }

    if body.action == "approve":
        update_data["review_status"] = "approved"
    elif body.action == "edit":
        update_data["review_status"] = "edited"
        update_data["founder_answer"] = body.edited_answer
        update_data["answer"] = body.edited_answer
    elif body.action == "override":
        update_data["review_status"] = "edited"
        update_data["founder_answer"] = body.edited_answer
        update_data["answer"] = body.edited_answer
    elif body.action == "dismiss":
        update_data["review_status"] = "dismissed"

    updated = (
        client.table("queries").update(update_data).eq("id", query_id).execute()
    )
    updated_row = updated.data[0] if updated.data else {**row, **update_data}

    # Broadcast to investors
    if body.action in ("approve", "edit", "override"):
        answer_text = updated_row.get("founder_answer") or updated_row.get("answer", "")
        await broadcast_approved_answer(query_id, answer_text, "verified")
    elif body.action == "dismiss":
        await broadcast_dismissed_question(query_id)

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

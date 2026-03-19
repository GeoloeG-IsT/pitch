"""Query API: create queries and stream AI answers via WebSocket."""
from __future__ import annotations

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.supabase import get_service_client
from app.models.query import QueryCreate, QueryResponse
from app.services.query_engine import run_query_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(tags=["query"])

# TODO(Phase 6): Replace with authenticated user from request
DEMO_USER_ID = "00000000-0000-0000-0000-000000000000"


@router.post("/query", status_code=201)
async def create_query(request: QueryCreate):
    """Create a query record. Returns query_id for WebSocket streaming."""
    client = get_service_client()
    result = client.table("queries").insert({
        "question": request.question,
        "user_id": DEMO_USER_ID,
        "status": "pending",
    }).execute()

    row = result.data[0]
    return QueryResponse(
        query_id=row["id"],
        question=row["question"],
        status=row["status"],
        created_at=row["created_at"],
    )


@router.websocket("/query/{query_id}/stream")
async def stream_query(websocket: WebSocket, query_id: str):
    """Stream AI answer tokens over WebSocket."""
    await websocket.accept()

    client = get_service_client()

    # Verify query exists and is pending
    try:
        result = client.table("queries").select("*").eq("id", query_id).single().execute()
    except Exception:
        await websocket.send_json({"type": "error", "message": "Query not found"})
        await websocket.close()
        return

    query_row = result.data
    if query_row["status"] != "pending":
        await websocket.send_json({"type": "error", "message": f"Query already {query_row['status']}"})
        await websocket.close()
        return

    # Update status to streaming
    client.table("queries").update({"status": "streaming"}).eq("id", query_id).execute()

    async def send_message(msg: dict) -> None:
        """Send a JSON message over the WebSocket."""
        await websocket.send_json(msg)

    try:
        answer, citations, confidence_score, confidence_tier = await run_query_pipeline(
            question=query_row["question"],
            query_id=query_id,
            send_message=send_message,
        )

        # Determine routing based on confidence tier
        if confidence_tier in ("low", "moderate"):
            # Low/moderate-confidence: queue for founder review
            client.table("queries").update({
                "answer": answer,
                "citations": [c.model_dump() for c in citations],
                "status": "queued",
                "confidence_score": confidence_score,
                "confidence_tier": confidence_tier,
                "review_status": "pending_review",
            }).eq("id", query_id).execute()

            await websocket.send_json({
                "type": "queued",
                "query_id": query_id,
                "confidence_score": confidence_score,
                "confidence_tier": confidence_tier,
            })
        else:
            # High: auto-publish with confidence data
            client.table("queries").update({
                "answer": answer,
                "citations": [c.model_dump() for c in citations],
                "status": "complete",
                "confidence_score": confidence_score,
                "confidence_tier": confidence_tier,
                "review_status": "auto_published",
            }).eq("id", query_id).execute()

            await websocket.send_json({
                "type": "done",
                "query_id": query_id,
                "confidence_score": confidence_score,
                "confidence_tier": confidence_tier,
            })

    except WebSocketDisconnect:
        logger.info("Client disconnected from query %s", query_id)
        client.table("queries").update({"status": "error", "metadata": {"error": "Client disconnected"}}).eq("id", query_id).execute()

    except Exception as e:
        logger.exception("Error streaming query %s", query_id)
        client.table("queries").update({
            "status": "error",
            "metadata": {"error": str(e)},
        }).eq("id", query_id).execute()
        try:
            await websocket.send_json({"type": "error", "message": "Something went wrong while generating the answer."})
        except Exception:
            pass  # WebSocket may already be closed

    finally:
        try:
            await websocket.close()
        except Exception:
            pass

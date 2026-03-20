"""Query API: create queries and stream AI answers via WebSocket."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect

from app.core.auth import get_current_user, get_user_or_share_token, validate_share_token
from app.core.supabase import get_service_client
from app.models.query import QueryCreate, QueryResponse
from app.services.query_engine import run_query_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(tags=["query"])


@router.get("/queries/history")
async def get_query_history(auth: dict = Depends(get_user_or_share_token)):
    """Return the user's past questions and answers."""
    client = get_service_client()
    query = (
        client.table("queries")
        .select("id, question, answer, citations, status, created_at, confidence_score, confidence_tier, review_status, founder_answer")
    )
    if auth["auth_type"] == "share_token":
        query = query.eq("share_token_id", auth["token_id"])
    else:
        query = query.eq("user_id", auth["sub"])
    result = (
        query
        .in_("status", ["complete", "error"])
        .order("created_at", desc=False)
        .limit(50)
        .execute()
    )
    return [
        QueryResponse(
            query_id=row["id"],
            question=row["question"],
            answer=row.get("answer"),
            citations=row.get("citations") or [],
            status=row["status"],
            created_at=row.get("created_at"),
            confidence_score=row.get("confidence_score"),
            confidence_tier=row.get("confidence_tier"),
            review_status=row.get("review_status", "auto_published"),
            founder_answer=row.get("founder_answer"),
        )
        for row in result.data
    ]


@router.post("/query", status_code=201)
async def create_query(request: QueryCreate, auth: dict = Depends(get_user_or_share_token)):
    """Create a query record. Returns query_id for WebSocket streaming."""
    client = get_service_client()
    insert_data: dict = {
        "question": request.question,
        "status": "pending",
    }
    if auth["auth_type"] == "share_token":
        insert_data["share_token_id"] = auth["token_id"]
    else:
        insert_data["user_id"] = auth["sub"]
        if hasattr(request, "share_token_id") and request.share_token_id:
            insert_data["share_token_id"] = request.share_token_id
    result = client.table("queries").insert(insert_data).execute()

    row = result.data[0]
    return QueryResponse(
        query_id=row["id"],
        question=row["question"],
        status=row["status"],
        created_at=row["created_at"],
    )


@router.websocket("/query/{query_id}/stream")
async def stream_query(
    websocket: WebSocket,
    query_id: str,
    access_token: str | None = Query(None),
    token: str | None = Query(None),
):
    """Stream AI answer tokens over WebSocket."""
    # Authenticate via JWT access_token or share token
    if access_token:
        import json as _json
        import jwt as pyjwt
        import httpx
        from app.core.config import settings
        try:
            try:
                pyjwt.decode(access_token, settings.supabase_jwt_secret, algorithms=["HS256"], audience="authenticated")
            except (pyjwt.InvalidSignatureError, pyjwt.InvalidAlgorithmError):
                jwks = httpx.get(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json").json()
                public_key = pyjwt.algorithms.ECAlgorithm.from_jwk(_json.dumps(jwks["keys"][0]))
                pyjwt.decode(access_token, public_key, algorithms=["ES256"], audience="authenticated")
        except pyjwt.InvalidTokenError:
            await websocket.close(code=4001)
            return
    elif token:
        result = await validate_share_token(token)
        if not result:
            await websocket.close(code=4001)
            return
    else:
        await websocket.close(code=4001)
        return

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

        # Check for active live session (overrides confidence-based routing)
        from app.api.v1.sessions import _active_sessions

        active_session = None
        active_founder_id = None
        for fid, session_data in _active_sessions.items():
            active_session = session_data
            active_founder_id = fid
            break  # PoC: single-tenant, at most one active session

        if active_session:
            # Live mode: ALL questions route through founder regardless of confidence
            investor_label = "Anonymous"
            if query_row.get("user_id"):
                try:
                    user_result = client.table("users").select("email").eq("id", query_row["user_id"]).single().execute()
                    investor_label = user_result.data.get("email", "Anonymous")
                except Exception:
                    pass
            elif query_row.get("share_token_id"):
                try:
                    token_result = client.table("share_tokens").select("investor_email").eq("id", query_row["share_token_id"]).single().execute()
                    investor_label = token_result.data.get("investor_email", "Anonymous")
                except Exception:
                    pass

            client.table("queries").update({
                "answer": answer,
                "citations": [c.model_dump() for c in citations],
                "status": "queued",
                "confidence_score": confidence_score,
                "confidence_tier": confidence_tier,
                "review_status": "pending_review",
                "live_session_id": active_session["id"],
            }).eq("id", query_id).execute()

            # Notify founder's presenter view
            from app.api.v1.notifications import notify_founder

            await notify_founder(active_founder_id, {
                "type": "new_live_question",
                "query_id": query_id,
                "question": query_row["question"],
                "investor_label": investor_label,
                "ai_draft": answer,
                "citations": [c.model_dump() for c in citations],
            })

            await websocket.send_json({"type": "queued", "query_id": query_id})

        # Determine routing based on confidence tier
        elif confidence_tier in ("low", "moderate"):
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

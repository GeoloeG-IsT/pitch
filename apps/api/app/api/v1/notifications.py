"""WebSocket notification channel for investor and founder push updates."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(tags=["notifications"])

# In-memory registry of connected investor WebSockets
_investor_connections: dict[str, WebSocket] = {}

# In-memory registry of connected founder WebSockets (list for multiple tabs)
_founder_connections: dict[str, list[WebSocket]] = {}

# Investor identity tracking: connection_id -> investor email
_investor_identities: dict[str, str] = {}


async def register_founder(founder_id: str, ws: WebSocket) -> None:
    """Register a founder WebSocket connection."""
    if founder_id not in _founder_connections:
        _founder_connections[founder_id] = []
    _founder_connections[founder_id].append(ws)


async def unregister_founder(founder_id: str, ws: WebSocket) -> None:
    """Unregister a founder WebSocket connection."""
    if founder_id in _founder_connections:
        try:
            _founder_connections[founder_id].remove(ws)
        except ValueError:
            pass
        if not _founder_connections[founder_id]:
            del _founder_connections[founder_id]


async def notify_founder(founder_id: str, message: dict) -> None:
    """Send a message to all connected founder WebSockets."""
    if founder_id not in _founder_connections:
        return

    dead: list[WebSocket] = []
    for ws in _founder_connections[founder_id]:
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)

    for ws in dead:
        try:
            _founder_connections[founder_id].remove(ws)
        except ValueError:
            pass

    if founder_id in _founder_connections and not _founder_connections[founder_id]:
        del _founder_connections[founder_id]


@router.websocket("/notifications/stream")
async def notification_stream(
    websocket: WebSocket,
    token: str | None = Query(None),
    access_token: str | None = Query(None),
):
    """Accept investor WebSocket connections for real-time notifications."""
    await websocket.accept()
    conn_id = str(id(websocket))
    _investor_connections[conn_id] = websocket

    # Resolve investor identity from JWT access_token or share token
    if access_token:
        try:
            import json as _json
            import jwt as pyjwt
            import httpx
            from app.core.config import settings

            try:
                payload = pyjwt.decode(
                    access_token,
                    settings.supabase_jwt_secret,
                    algorithms=["HS256"],
                    audience="authenticated",
                )
            except (pyjwt.InvalidSignatureError, pyjwt.InvalidAlgorithmError):
                jwks = httpx.get(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json").json()
                public_key = pyjwt.algorithms.ECAlgorithm.from_jwk(_json.dumps(jwks["keys"][0]))
                payload = pyjwt.decode(
                    access_token,
                    public_key,
                    algorithms=["ES256"],
                    audience="authenticated",
                )
            email = payload.get("email")
            if email:
                _investor_identities[conn_id] = email
                # Notify all founders of updated investor count
                await _notify_investor_count_change()
        except Exception:
            pass
    elif token:
        try:
            from app.core.supabase import get_service_client

            client = get_service_client()
            token_result = (
                client.table("share_tokens")
                .select("investor_email, founder_id")
                .eq("token", token)
                .single()
                .execute()
            )
            if token_result.data and token_result.data.get("investor_email"):
                _investor_identities[conn_id] = token_result.data["investor_email"]
                # Notify founder of updated investor count
                founder_id = token_result.data.get("founder_id")
                if founder_id:
                    await broadcast_investor_count(founder_id)
        except Exception:
            pass

    try:
        while True:
            await websocket.receive_text()  # keep-alive
    except WebSocketDisconnect:
        _investor_connections.pop(conn_id, None)
        _investor_identities.pop(conn_id, None)
        # Notify founder of updated investor count on disconnect
        await _notify_investor_count_change()
    except Exception:
        _investor_connections.pop(conn_id, None)
        _investor_identities.pop(conn_id, None)


async def _notify_investor_count_change() -> None:
    """Notify all connected founders of investor count change."""
    for founder_id in list(_founder_connections.keys()):
        await broadcast_investor_count(founder_id)


def get_connected_investors() -> list[str]:
    """Return unique investor emails of currently connected investors."""
    return list(set(_investor_identities.values()))


async def broadcast_approved_answer(
    query_id: str, answer: str, confidence_tier: str
) -> None:
    """Broadcast an approved answer to all connected investor WebSockets."""
    message = {
        "type": "answer_approved",
        "query_id": query_id,
        "answer": answer,
        "confidence_tier": "verified",
    }
    dead: list[str] = []
    for conn_id, ws in _investor_connections.items():
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(conn_id)

    for conn_id in dead:
        _investor_connections.pop(conn_id, None)


async def broadcast_session_event(founder_id: str, message: dict) -> None:
    """Broadcast a session event to all connected investor WebSockets."""
    dead: list[str] = []
    for conn_id, ws in _investor_connections.items():
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(conn_id)

    for conn_id in dead:
        _investor_connections.pop(conn_id, None)


async def broadcast_dismissed_question(query_id: str) -> None:
    """Broadcast a question dismissal to all connected investor WebSockets."""
    message = {
        "type": "question_dismissed",
        "query_id": query_id,
    }
    dead: list[str] = []
    for conn_id, ws in _investor_connections.items():
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(conn_id)

    for conn_id in dead:
        _investor_connections.pop(conn_id, None)


async def broadcast_investor_count(founder_id: str) -> None:
    """Send the current connected investor count to the founder."""
    investors = get_connected_investors()
    await notify_founder(founder_id, {
        "type": "investor_count",
        "count": len(investors),
        "investors": investors,
    })
